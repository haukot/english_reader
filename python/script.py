import spacy

book = """
The palace still shook occasionally as the earth rumbled in memory, groaned as if it would deny what had happened. Bars of sunlight cast through rents in the walls made motes of dust glitter where they yet hung in the air. Scorch-marks marred the walls, the floors, the ceilings. Broad black smears crossed the blistered paints and gilt of once-bright murals, soot overlaying crumbling friezes of men and animals which seemed to have attempted to walk before the madness grew quiet. The dead lay everywhere, men and women and children, struck down in attempted flight by the lightnings that had flashed down every corridor, or seized by the fires that had stalked them, or sunken into stone of the palace, the stones that had flowed and sought, almost alive, before stillness came again. In odd counterpoint, colorful tapestries and paintings, masterworks all, hung undisturbed except where bulging walls had pushed them awry. Finely carved furnishings, inlaid with ivory and gold, stood untouched except where rippling floors had toppled them. The mind-twisting had struck at the core, ignoring peripheral things.

Lews Therin Telamon wandered the palace, deftly keeping his balance when the earth heaved. “Ilyena! My love, where are you?” The edge of his pale gray cloak trailed through blood as he stepped across the body of a woman, her golden-haired beauty marred by the horror of her last moments, her still-open eyes frozen in disbelief. “Where are you, my wife? Where is everyone hiding?”

His eyes caught his own reflection in a mirror hanging askew from bubbled marble. His clothes had been regal once, in gray and scarlet and gold; now the finely-woven cloth, brought by merchants from across the World Sea, was torn and dirty, thick with the same dust that covered his hair and skin. For a moment he fingered the symbol on his cloak, a circle half white and half black, the colors separated by a sinuous line. It meant something, that symbol. But the embroidered circle could not hold his attention long. He gazed at his own image with as much wonder. A tall man just into his middle years, handsome once, but now with hair already more white than brown and a face lined by strain and worry, dark eyes that had seen too much. Lews Therin began to chuckle, then threw back his head; his laughter echoed down the lifeless halls.

“Ilyena, my love! Come to me, my wife. You must see this.”
"""

nlp = spacy.load("en_core_web_sm")
doc = nlp(book)

tags = {
    'NOUN': 'n',
    'ADJ': 'j',
    'ADV': 'd',
    'VERB': 'v'
}

offset = 0

for token in doc:
    tag = tags.get(token.pos_, 'x')
    idx = offset + token.idx
    end_idx = offset + token.idx + len(token.text)
    # print(token.text, token.pos_, token.idx, len(token.text), tags.get(token.pos_, 'x'))
    if (tag != 'x'):
        book = book[:idx] + '<span t="' + tag + '">' + book[idx:end_idx] + '</span>' + book[end_idx:]
        offset = offset + 19

for sent in doc.sents:
    print(sent.start_char, ',', sent.end_char)

print(book)
