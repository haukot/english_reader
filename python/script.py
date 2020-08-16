import json
import spacy

# book = """
# The palace still shook occasionally as the earth rumbled in memory, groaned as if it would deny what had happened. Bars of sunlight cast through rents in the walls made motes of dust glitter where they yet hung in the air. Scorch-marks marred the walls, the floors, the ceilings. Broad black smears crossed the blistered paints and gilt of once-bright murals, soot overlaying crumbling friezes of men and animals which seemed to have attempted to walk before the madness grew quiet. The dead lay everywhere, men and women and children, struck down in attempted flight by the lightnings that had flashed down every corridor, or seized by the fires that had stalked them, or sunken into stone of the palace, the stones that had flowed and sought, almost alive, before stillness came again. In odd counterpoint, colorful tapestries and paintings, masterworks all, hung undisturbed except where bulging walls had pushed them awry. Finely carved furnishings, inlaid with ivory and gold, stood untouched except where rippling floors had toppled them. The mind-twisting had struck at the core, ignoring peripheral things.

# Lews Therin Telamon wandered the palace, deftly keeping his balance when the earth heaved. “Ilyena! My love, where are you?” The edge of his pale gray cloak trailed through blood as he stepped across the body of a woman, her golden-haired beauty marred by the horror of her last moments, her still-open eyes frozen in disbelief. “Where are you, my wife? Where is everyone hiding?”

# His eyes caught his own reflection in a mirror hanging askew from bubbled marble. His clothes had been regal once, in gray and scarlet and gold; now the finely-woven cloth, brought by merchants from across the World Sea, was torn and dirty, thick with the same dust that covered his hair and skin. For a moment he fingered the symbol on his cloak, a circle half white and half black, the colors separated by a sinuous line. It meant something, that symbol. But the embroidered circle could not hold his attention long. He gazed at his own image with as much wonder. A tall man just into his middle years, handsome once, but now with hair already more white than brown and a face lined by strain and worry, dark eyes that had seen too much. Lews Therin began to chuckle, then threw back his head; his laughter echoed down the lifeless halls.

# “Ilyena, my love! Come to me, my wife. You must see this.”
# """

# book = """
# The one. Something is none
# """

with open('file.txt', 'r') as file:
    book = file.read()

nlp = spacy.load("en_core_web_sm")

tags = {
    'NOUN': 'n',
    'ADJ': 'j',
    'ADV': 'd',
    'VERB': 'v'
}

part_start_idx = 0
book_tags_offset = 0
pages = []
page_length = 8000
res_book = ""

def transform(part):
    global book_tags_offset

    offset = 0
    cur_page_start = 0

    doc = nlp(part)
    for sent in doc.sents:
        sent_idx = offset + sent.start_char
        sent_end_idx = offset + sent.end_char

        text = part[sent_idx:sent_end_idx]
        sent_offset = -sent.start_char

        for token in sent:
            tag = tags.get(token.pos_, 'x')
            idx = sent_offset + token.idx
            end_idx = sent_offset + token.idx + len(token.text)
            # print(token.text, token.idx, idx, end_idx, offset, sent_idx, text)
            if (tag != 'x'):
                text = text[:idx] + '<span t="' + tag + '">' + text[idx:end_idx] + '</span>' + text[end_idx:]

                sent_offset = sent_offset + 19 # added span tag length
                offset = offset + 19

        part = part[:sent_idx] + '<span class="sentence">' + text + '</span>' + part[sent_end_idx:]
        offset = offset + 30 # added span tag length

        # detect pages
        end_idx = sent.end_char + offset
        if (end_idx - cur_page_start > page_length):
            pages.append([
                cur_page_start + book_tags_offset + part_start_idx,
                end_idx + book_tags_offset + part_start_idx
            ])
            cur_page_start = end_idx

    book_tags_offset = book_tags_offset + offset
    return part


while True:
    end_idx = book.find('\n', part_start_idx + 100000)
    if (end_idx == -1):
        end_idx = part_start_idx + 100000

    part = book[part_start_idx:end_idx]
    new_part = transform(part)
    res_book = res_book + new_part

    if (end_idx > len(book)):
        break
    part_start_idx = end_idx


end_book_idx = len(book) + book_tags_offset
if (len(pages) == 0):
    pages.append([0, end_book_idx])
if (pages[-1][1] < end_book_idx):
    pages.append([pages[-1][0] + 1, end_book_idx])

js_file = "export const pages = " + json.dumps(pages) + ";\n"
js_file = js_file + "export const book = `" + res_book + "`;\n"

with open('../frontend/book.js', 'w') as file:
    file.write(js_file)
