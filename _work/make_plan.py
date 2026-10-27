# خطة رسومات القصص الأربع (ثلاثية الأبعاد): أوراق الشخصيات + الغلاف + 10 صفحات + النهاية + التلوين، للولد والبنت
import json
STYLE = ("Children's picture-book illustration in polished 3D animated feature-film style, soft cinematic lighting, "
         "vibrant saturated colors, magical atmosphere, wide landscape 3:2. No text, no letters, no watermark, no logo.")
KID = {
    "m": "a cute 5-year-old Omani boy with big expressive brown eyes, warm light-tan skin, rosy cheeks, tousled dark brown hair and a joyful smile",
    "f": "a cute 5-year-old Omani girl with big expressive brown eyes, warm light-tan skin, rosy cheeks and a joyful smile, wearing a soft pink hijab that covers her hair",
}
S = {
 "astro": {
  "outfit": {"m": ["a white-and-sky-blue astronaut suit with an orange star badge, holding a clear-visor helmet", "navy-blue pajamas with small yellow stars"],
             "f": ["a white-and-lavender astronaut suit with a pink star badge, holding a clear-visor helmet", "lilac pajamas with small yellow stars"]},
  "side": "Character sheet on a plain soft lavender background, three characters side by side, full body: Bibo, a small round white robot with a glossy dome head, two big glowing cyan eyes, a tiny antenna with a light and short stubby arms; Zuzu, a small coral-pink fluffy alien with huge friendly eyes and two curly antennae; and a little golden star with a cute face and tiny arms.",
  "cover": "the {kid} stands on a glowing silvery moon surface pointing excitedly up at the stars with a big open-mouth smile, wearing {o0}; Bibo hovers happily beside; a sleek white-and-orange rocket nearby; huge colorful planets, a golden ringed planet and the blue Earth in a deep blue starry sky with soft purple nebula",
  "pages": [
   ["right", "at night the {kid} in {o1} kneels on the bed by a big open window, chin in hands, gazing dreamily at a huge glowing full moon; cozy bedroom with rocket posters, warm desk lamp, a toy rocket and a teddy bear"],
   ["left", "Bibo floats just outside the open bedroom window waving hello with glowing cyan eyes; the {kid} in {o1} sits up in bed in delighted surprise; moonlight and tiny magical sparkles"],
   ["right", "sunrise on a launch pad: the {kid} in {o0} waves happily next to Bibo in front of a giant white-and-orange rocket with a tall launch tower and soft steam"],
   ["left", "inside a round rocket window: the {kid} in {o0} and Bibo look out happily at the beautiful blue Earth with the Arabian Peninsula visible, stars all around"],
   ["right", "the {kid} in {o0} jumps very high on the moon surface leaving footprints in silver dust, laughing; Bibo bounces along; Earth in the black starry sky"],
   ["left", "the {kid} in {o0} joyfully slides along the colorful glowing rings of Saturn like a slide, arms raised; Bibo cheers with sparkling lights"],
   ["right", "on a colorful candy-like planet with lollipop trees and pink grass the {kid} in {o0} meets Zuzu the coral-pink fluffy alien; they shake hands and smile; Bibo watches"],
   ["left", "in deep space the {kid} in {o0} and Bibo find the little golden star crying softly, lost and alone; the child kneels and comforts it kindly"],
   ["right", "the {kid} in {o0} gently lifts the little golden star back up to a sparkling family of stars; the whole sky lights up with joy"],
   ["left", "back home at night the {kid} in {o1} sleeps peacefully smiling in bed hugging the teddy bear; through the window a little golden star twinkles and Bibo waves goodbye"]
  ],
  "end": "the {kid} in {o0} and Bibo, Zuzu and the little golden star wave goodbye together on the moon, Earth glowing behind them, confetti of tiny stars",
 },
 "sea": {
  "outfit": {"m": ["a turquoise swim rash-guard shirt and navy swim shorts", "a turquoise swim rash-guard shirt and navy swim shorts inside a clear magical glass bubble helmet around the head"],
             "f": ["a modest full-length pink-and-turquoise swimsuit with a matching pink swim hijab", "a modest full-length pink-and-turquoise swimsuit with a matching pink swim hijab inside a clear magical glass bubble helmet around the head"]},
  "side": "Character sheet on a plain soft aqua background, characters side by side: Dana, a small friendly light-blue dolphin with big sparkling eyes and a pink cheek blush; Nono, a small cute purple octopus with big round eyes; a huge gentle blue whale with a kind smile; and a glowing magical pearly seashell.",
  "cover": "underwater in a sunlit coral reef the {kid} wearing {o1} swims happily holding onto Dana the light-blue dolphin; colorful corals, tropical fish, light rays from the surface, bubbles",
  "pages": [
   ["right", "golden sunset on a sandy Omani beach near Muscat with mountains behind; the {kid} wearing {o0} kneels in the sand amazed, holding a glowing magical pearly seashell"],
   ["left", "Dana the light-blue dolphin leaps out of the sparkling sunset waves, smiling at the {kid} wearing {o0} who stands at the water's edge holding the glowing shell"],
   ["right", "the {kid} wearing {o1} is amazed, touching the bubble; Dana beside; they start diving into clear turquoise water, sparkles swirling"],
   ["left", "a breathtaking colorful coral reef: red, yellow and purple corals; schools of clownfish and tropical fish swim around the {kid} wearing {o1} who waves happily; Dana nearby"],
   ["right", "Nono the little purple octopus cries sadly in a messy sea garden littered with plastic bags and bottles; the {kid} wearing {o1} and Dana look concerned"],
   ["left", "the {kid} wearing {o1}, Dana and Nono happily collect plastic bags and bottles into a big net together, teamwork, bubbles"],
   ["right", "the clean coral garden glows with color; happy fish dance around; Nono paints colorful swirls of ink in the water; the {kid} wearing {o1} laughs"],
   ["left", "inside an old sunken wooden ship, the {kid} wearing {o1} opens a small treasure chest revealing a big glowing white pearl; Dana watches with wide eyes"],
   ["right", "a huge gentle blue whale carries the {kid} wearing {o1} on its back up toward the shining sea surface; Dana swims alongside; light rays"],
   ["left", "back on the beach at dusk the {kid} wearing {o0} waves goodbye to Dana jumping in the waves, holding the glowing shell close to the heart"]
  ],
  "end": "the {kid} wearing {o1} with Dana, Nono and the big blue whale in a glowing clean coral reef, waving together, bubbles and happy fish",
 },
 "dino": {
  "outfit": {"m": ["a khaki explorer shirt, olive shorts and a small orange backpack"], "f": ["a khaki explorer dress over leggings, a small orange backpack"]},
  "side": "Character sheet on a plain soft mint background, characters side by side: Dudu, a cute baby triceratops, mint-green with a peach belly, tiny horns and huge sparkly eyes; his mother, a big gentle green triceratops; a tall friendly long-neck brachiosaurus; a friendly orange pterosaur; and a big but cute orange-brown T-rex with small arms; plus a golden sand hourglass.",
  "cover": "in a lush prehistoric jungle with giant ferns and a distant smoking volcano the {kid} wearing {o0} hugs Dudu the baby triceratops, both laughing; a tall brachiosaurus and flying pterosaurs behind; golden sunlight",
  "pages": [
   ["right", "an attic with old trunks and dusty books; the {kid} wearing {o0} holds a shining golden sand hourglass that swirls with magical golden light"],
   ["left", "the {kid} wearing {o0} stands amazed in a giant prehistoric jungle with huge ferns and a distant smoking volcano, golden sparkles fading around"],
   ["right", "Dudu the baby triceratops peeks out shyly crying from behind a giant leaf; the {kid} wearing {o0} kneels and gently wipes his tears"],
   ["left", "the {kid} wearing {o0} and Dudu ride high on the neck of a tall friendly brachiosaurus above the treetops, pointing at a big nest by a far lake"],
   ["right", "friendly orange pterosaurs carry the {kid} wearing {o0} and Dudu flying over a wide sparkling river, joyful"],
   ["left", "a big orange-brown T-rex appears between the trees looking scary but with tears, a thorn stuck in its foot; the {kid} wearing {o0} and Dudu peek from behind a rock"],
   ["right", "the {kid} wearing {o0} bravely and gently pulls the thorn from the T-rex's foot; the T-rex smiles gratefully"],
   ["left", "at a big nest by the lake Dudu runs into his mother's hug; happy dinosaurs cheer around the {kid} wearing {o0}"],
   ["right", "Dudu gives the {kid} wearing {o0} a small stone with his footprint; the golden hourglass glows; sunset over the jungle"],
   ["left", "back in a cozy bedroom the {kid} wearing {o0} places the footprint stone on a shelf full of dinosaur toys, smiling proudly"]
  ],
  "end": "the {kid} wearing {o0} with Dudu, his mother, the brachiosaurus and the smiling T-rex waving together at sunset in the jungle",
 },
 "oman": {
  "outfit": {"m": ["a white Omani dishdasha and an embroidered Omani kumma cap"], "f": ["a colorful embroidered traditional Omani girl's dress and a soft pink hijab"]},
  "side": "Character sheet on a plain soft sand-beige background, characters side by side: Shaheen, a friendly cute peregrine falcon with golden eyes and brown-cream feathers; a kind Omani grandfather with a short white beard, white dishdasha and embroidered kumma cap; and a gentle smiling camel with a colorful saddle blanket; plus an old rolled treasure map.",
  "cover": "in front of the round tower of Nizwa Fort with palm groves and mountains, the {kid} wearing {o0} holds an old treasure map, smiling excitedly; Shaheen the falcon perches proudly on the child's shoulder; warm golden light",
  "pages": [
   ["right", "in a traditional Omani house courtyard in Nizwa, the kind grandfather hands an old rolled treasure map to the {kid} wearing {o0}; palm trees, carved wooden door"],
   ["left", "Shaheen the friendly falcon lands on the shoulder of the {kid} wearing {o0}; the child smiles in surprise; blue sky and palm trees"],
   ["right", "the {kid} wearing {o0} stands on top of the round tower of Nizwa Fort looking over endless green palm groves and mountains; Shaheen flies nearby"],
   ["left", "the {kid} wearing {o0} rides a gentle smiling camel across tall golden sand dunes of the Omani desert; Shaheen flies ahead"],
   ["right", "night in the desert under a sky full of stars; the {kid} wearing {o0} sits on a rug eating dates by a small lantern; Shaheen perches nearby counting stars"],
   ["left", "on the green mountain Jebel Akhdar: cool terraces, pomegranate trees and pink roses; the {kid} wearing {o0} smells a rose happily; Shaheen above"],
   ["right", "on an old wooden Omani dhow boat at sea near Sur, the {kid} wearing {o0} laughs as dolphins jump around the boat; Shaheen on the mast"],
   ["left", "the {kid} wearing {o0} reads the end of the old map thoughtfully, then smiles with an idea; Shaheen tilts its head; sunset colors"],
   ["right", "back at the grandfather's house: the whole Omani family gathered around a dinner mat with food welcomes the {kid} wearing {o0}; the grandfather smiles warmly"],
   ["left", "the {kid} wearing {o0} hugs the kind grandfather at dusk; Shaheen flies over the round tower of Nizwa Fort in the orange sky"]
  ],
  "end": "the {kid} wearing {o0} waves with the grandfather, the camel and Shaheen the falcon in front of Nizwa Fort at sunset",
 },
}
SIDE_FREE = {"right": "keep the RIGHT third calm and uncluttered (no characters or details) for the story text; characters on the left two thirds",
             "left": "keep the LEFT third calm and uncluttered (no characters or details) for the story text; characters on the right two thirds"}

def kid_sheet(g, st):
    o = S[st]["outfit"][g]
    looks = " ; ".join(f"view {i+1}: wearing {x}" for i, x in enumerate(o)) if len(o) > 1 else f"front view and three-quarter view, wearing {o[0]}"
    return (f"Character sheet on a plain soft pastel background: the same {KID[g]}, shown twice side by side, full body, standing ({looks}). "
            "Consistent face and proportions in both views. " + STYLE)

plan = {"style": STYLE, "refs": {}, "pages": {}}
for st, d in S.items():
    plan["refs"][f"{st}/side"] = d["side"] + " " + STYLE
    for g in ("m", "f"):
        plan["refs"][f"{st}/{g}"] = kid_sheet(g, st)
        o = d["outfit"][g]
        ctx = {"kid": ("boy" if g == "m" else "girl"), "o0": o[0], "o1": o[1] if len(o) > 1 else o[0]}
        lead = (f"Reference 1 is the main child: keep exactly the same face, eyes, skin and {'hair' if g == 'm' else 'pink hijab'}. "
                "Reference 2 shows the side characters: keep their designs. ")
        fillx = lambda txt: txt.format(**ctx)
        plan["pages"][f"{st}/{g}/cover"] = {"refs": [f"{st}/{g}", f"{st}/side"], "prompt": lead + "Scene: " + fillx(d["cover"]) +
            ". Composition: keep the TOP third as open sky or soft background with no important details, for the title; keep the bottom-right corner simple. " + STYLE}
        for i, (side, scene) in enumerate(d["pages"], 1):
            plan["pages"][f"{st}/{g}/p{i}"] = {"side": side, "refs": [f"{st}/{g}", f"{st}/side"], "prompt": lead + "Scene: " + fillx(scene) + ". Composition: " + SIDE_FREE[side] + ". " + STYLE}
        plan["pages"][f"{st}/{g}/end"] = {"refs": [f"{st}/{g}", f"{st}/side"], "prompt": lead + "Scene: " + fillx(d["end"]) +
            ". Composition: keep the TOP 40% simple and calm for a text card. " + STYLE}
        plan["pages"][f"{st}/{g}/color"] = {"refs": [f"{st}/{g}", f"{st}/side"], "prompt": lead + "A black-and-white COLORING PAGE for kids: clean bold black outlines only on pure white, no shading, no gray, no color. Scene: " + fillx(d["cover"]) +
            ". Simple shapes, large areas to color, wide landscape 3:2. No text, no letters."}
json.dump(plan, open("/home/claude/gen/art3d/plan.json", "w"), ensure_ascii=False, indent=1)
print(len(plan["refs"]), "refs,", len(plan["pages"]), "pages; credits ≈", len(plan["refs"]) * 406 + len(plan["pages"]) * 812)
