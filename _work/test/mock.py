"""Supabase وهمي داخل Playwright: يقلّد PostgREST والدخول والمخزن بما يكفي لاختبار المتجر واللوحة محلياً."""
import json, re, time, uuid, copy
from urllib.parse import urlparse, parse_qs, unquote

API = "https://zcnwzpevehudhnsuljdy.supabase.co"

class Mock:
    def __init__(self, seed_path, coupons_path=None):
        seed = json.load(open(seed_path))
        self.db = {
            "store_settings": [{"id": 1, "config": seed["config"], "updated_at": "2026-10-20T10:00:00Z"}],
            "categories": seed["categories"],
            "products": seed["products"],
            "product_media": seed["media"],
            "reviews": [],
            "orders": [],
            "customers": [],
            "coupons": json.load(open(coupons_path)) if coupons_path else [],
            "stats_daily": [],
            "product_stats": [],
            "restock_requests": [],
            "admin_users": [{"id": "u-owner"}],
        }
        self.log = []
        self.photos = {}
        self.deleted_photos = []
        self.fail_upload = False
        self.clean_list = []
        self.photo_bytes = b""
        self.user = {"id": "u-owner", "email": "owner@example.com", "aud": "authenticated", "role": "authenticated",
                     "user_metadata": {"must_change_password": True}, "app_metadata": {"provider": "email"}}

    # ---------- PostgREST filters ----------
    def _filter(self, rows, qs):
        out = rows
        for k, vals in qs.items():
            if k in ("select", "order", "limit", "offset", "on_conflict", "columns"):
                continue
            for v in vals:
                m = re.match(r"^(not\.)?(eq|neq|in|is|gt|gte|lt|lte|like|ilike)\.(.*)$", v)
                if not m:
                    continue
                neg, op, arg = m.groups()
                def test(r, op=op, arg=arg, k=k):
                    x = r.get(k)
                    if op == "eq": return str(x).lower() == arg.lower() if isinstance(x, bool) else str(x) == arg
                    if op == "neq": return str(x) != arg
                    if op == "in":
                        items = [a.strip().strip('"') for a in arg.strip("()").split(",")]
                        return str(x) in items
                    if op == "is": return (x is None) if arg == "null" else (x is (arg == "true"))
                    if op in ("gt", "gte", "lt", "lte"):
                        if x is None: return False
                        a, b = str(x), arg
                        return {"gt": a > b, "gte": a >= b, "lt": a < b, "lte": a <= b}[op]
                    return True
                out = [r for r in out if (not test(r)) == bool(neg)]
        if "order" in qs:
            for part in reversed(qs["order"][0].split(",")):
                col, *mods = part.split(".")
                desc = "desc" in mods
                out = sorted(out, key=lambda r: (r.get(col) is None, r.get(col) if r.get(col) is not None else ""), reverse=desc)
        if "offset" in qs:
            out = out[int(qs["offset"][0]):]
        if "limit" in qs:
            out = out[: int(qs["limit"][0])]
        return out

    def _project(self, rows, qs):
        sel = qs.get("select", ["*"])[0]
        if sel == "*" or "(" in sel:
            return rows
        cols = [c.split(":")[0] for c in sel.split(",")]
        return [{c: r.get(c) for c in cols} for r in rows]

    # ---------- RPC ----------
    def rpc(self, name, body):
        if name == "track": return 204, None
        if name == "social_proof": return 200, None
        if name == "is_admin": return 200, True
        if name == "check_coupon":
            c = str(body.get("c", "")).strip().upper()
            k = next((x for x in self.db["coupons"] if x["code"] == c and x.get("enabled")), None)
            return 200, ({"code": k["code"], "kind": k["kind"], "value": k["value"], "min_total": k["min_total"], "phone_bound": False} if k else None)
        if name == "loyalty_status":
            o = next((x for x in self.db["orders"] if x["order_no"] == body.get("ono")), None)
            if not o: return 200, {"enabled": True, "ok": False}
            return 200, {"enabled": True, "ok": True, "name": o["customer_name"].split()[0], "points": 0, "pending": int(float(o["total"]) * 2), "need": 30, "value": 1, "per_omr": 2, "coupon": None}
        if name == "fav": return 204, None
        if name in ("backup_list",): return 200, []
        if name in ("ai_key_status",): return 200, {}
        if name == "store_stats": return 200, None
        if name == "huroof_photos_to_clean": return 200, list(self.clean_list)
        return 200, None

    # ---------- the route handler ----------
    def handle(self, route):
        req = route.request
        u = urlparse(req.url)
        qs = {k: v for k, v in parse_qs(u.query, keep_blank_values=True).items()}
        path = unquote(u.path)
        method = req.method
        body = None
        try: raw = req.post_data
        except Exception: raw = None
        if raw:
            try: body = json.loads(raw)
            except Exception: body = raw
        self.log.append((method, path, u.query, body))
        hdr = {"content-type": "application/json", "access-control-allow-origin": "*",
               "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range"}
        if method == "OPTIONS":
            return route.fulfill(status=200, headers=hdr, body="")
        def send(status, data=None, extra=None):
            h = dict(hdr)
            if extra: h.update(extra)
            return route.fulfill(status=status, headers=h, body="" if data is None else json.dumps(data))

        # auth
        if path.startswith("/auth/v1/token"):
            if body and body.get("password") == "wrong": return send(400, {"error": "invalid_grant", "error_description": "Invalid login credentials"})
            now = int(time.time())
            return send(200, {"access_token": "header." + "x" * 40 + ".sig", "token_type": "bearer", "expires_in": 3600, "expires_at": now + 3600, "refresh_token": "r" * 20, "user": self.user})
        if path.startswith("/auth/v1/user"):
            if method == "PUT" and isinstance(body, dict):
                if "data" in body: self.user["user_metadata"].update(body["data"])
            return send(200, self.user)
        if path.startswith("/auth/v1/logout"):
            return send(204)
        if path.startswith("/storage/v1/object/story-photos/") and method == "POST":
            key = path[len("/storage/v1/object/story-photos/"):]
            if not re.match(r"^[0-9]{8}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$", key):
                return send(400, {"statusCode": "403", "error": "Unauthorized", "message": "new row violates row-level security policy"})
            if self.fail_upload:
                return send(500, {"message": "boom"})
            self.photos[key] = {"size": len(req.post_data_buffer or b""), "at": time.time(), "auth": req.headers.get("authorization"), "type": req.headers.get("content-type")}
            return send(200, {"Key": "story-photos/" + key, "Id": str(uuid.uuid4())})
        if path.startswith("/storage/v1/object/sign/story-photos/") and method == "GET":
            return route.fulfill(status=200, headers={"content-type": "image/jpeg", "access-control-allow-origin": "*"}, body=self.photo_bytes)
        if path.startswith("/storage/v1/object/sign/story-photos/"):
            key = path[len("/storage/v1/object/sign/story-photos/"):]
            return send(200, {"signedURL": "/object/sign/story-photos/" + key + "?token=t"})
        if path.startswith("/storage/v1/object/list/story-photos"):
            pre = (body or {}).get("prefix", "") if isinstance(body, dict) else ""
            if not pre:
                days = sorted({k.split("/")[0] for k in self.photos})
                return send(200, [{"name": d, "id": None, "metadata": None} for d in days])
            items = [{"name": k.split("/")[1], "id": k, "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(v["at"])), "metadata": {"size": v["size"]}} for k, v in self.photos.items() if k.startswith(pre.rstrip("/") + "/")]
            return send(200, items)
        if path == "/storage/v1/object/story-photos" and method == "DELETE":
            gone = [k for k in (body or {}).get("prefixes", []) if self.photos.pop(k, None) is not None]
            self.deleted_photos.extend(gone)
            return send(200, [{"name": k} for k in gone])
        if path.startswith("/storage/v1/"):
            return send(200, {"Key": "product-images/x.jpg"})
        if path.startswith("/functions/v1/"):
            return send(200, {"rev": 0, "data": None})

        m = re.match(r"^/rest/v1/(rpc/)?([a-z_]+)$", path)
        if not m:
            return send(404, {"message": "not found"})
        is_rpc, table = m.groups()
        if is_rpc:
            st, data = self.rpc(table, body or {})
            return send(st, data)
        rows = self.db.setdefault(table, [])
        prefer = req.headers.get("prefer", "")
        accept = req.headers.get("accept", "")
        if method in ("GET", "HEAD"):
            out = self._project(self._filter(rows, qs), qs)
            if "vnd.pgrst.object" in accept:
                if not out: return send(406, {"message": "no rows", "code": "PGRST116"})
                return send(200, out[0])
            return send(200, out, {"content-range": f"0-{max(0, len(out) - 1)}/{len(out)}"})
        if method == "POST":
            items = body if isinstance(body, list) else [body]
            res = []
            for it in items:
                it = dict(it)
                if table == "orders":
                    if any(x["order_no"] == it.get("order_no") for x in rows): return send(409, {"code": "23505", "message": "dup"})
                    it.setdefault("id", str(uuid.uuid4())); it.setdefault("status", "new"); it.setdefault("hidden", False)
                    it.setdefault("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                key = "code" if table == "coupons" else "id"
                if "merge-duplicates" in prefer and key in it:
                    ex = next((r for r in rows if r.get(key) == it[key]), None)
                    if ex: ex.update(it); res.append(ex); continue
                rows.append(it); res.append(it)
            return send(201, res if "return=representation" in prefer else None)
        if method == "PATCH":
            hit = self._filter(rows, qs)
            for r in hit:
                r.update(body or {})
                if table == "store_settings": r["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            return send(200, self._project(hit, qs) if "return=representation" in prefer else None)
        if method == "DELETE":
            hit = self._filter(rows, qs)
            for r in hit: rows.remove(r)
            return send(204)
        return send(405)

    def calls(self, method=None, contains=""):
        return [c for c in self.log if (method is None or c[0] == method) and contains in c[1]]
