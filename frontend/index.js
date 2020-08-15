import lemmatize from "wink-lemmatizer"
import { setCORS } from "google-translate-api-browser"
import { book } from "./book"

// setting up cors-anywhere server address
const translate = setCORS("http://cors-anywhere.herokuapp.com/")

let curSentence = null

function partOfSpeech(attr) {
  const parts = {
    n: 'noun',
    j: 'adjective',
    d: 'adverb',
    v: 'verb',
  }

  return parts[attr]
}

function lemma(attr, word) {
  const lemmFunc = partOfSpeech(attr)
  // dont have adverb lemmatization(maybe not even need it)
  return lemmatize[lemmFunc] ? lemmatize[lemmFunc](word) : word
}

function lookup(attr, word) {
  const funcs = {
    x: 'lookup',
    n: 'lookupNoun',
    j: 'lookupAdjective',
    d: 'lookupAdverb',
    v: 'lookupVerb',
  }
  const lookupFunc = funcs[attr]

  return wordpos[lookupFunc](word)
    .then(res => {
      if (res.length === 0) {
        const lemmatized = lemma(attr, word)

        return Promise.all([wordpos.lookup(word), wordpos[lookupFunc](lemmatized)])
          .then((res) => {
            let [resAll, resLemm] = res
            const delimiterEntity = {
              def: `<b>All results:</b>`,
              exp: [],
              synonyms: []
            }
            if (resAll.length > 0) resAll = [delimiterEntity, ...resAll]
            return [...resLemm, ...resAll]
          })
      }
      return res
    })
}

function main() {
  // insert book
  let text = document.querySelector('.text')
  text.innerHTML = book

  // process spans
  let elements = document.querySelectorAll('.text span:not(.sentence)')
  let dict = document.querySelector('.dictionary')
  let rememberBtn = document.querySelector('button.remember')

  let myFunction = function() {
    curSentence = this.closest('.sentence')

    let word = this.innerHTML
    rememberBtn.setAttribute('data-word', word)

    let attribute = this.getAttribute("t")
    lookup(attribute, word)
      .then(res => {
        console.log('HUI', res)
        let defs = res.map(r => {
          // Показывает примеры с синонимами по умолчанию.
          let examples = r.exp.map(e => `"${e}"`).filter(e => e.includes(word)).join(' ')
          if (examples.length > 0) examples = `|| E.g.: <i>${examples}</i>`
          let synonims = r.synonyms.filter(s => s !== word).map(s => `<a href='123'>${s}</a>`).join(', ')
          if (synonims.length > 0) synonims = `(${synonims})`
          return `<li>${synonims} <span>${r.def}</span> ${examples} </li>`
        }).join('')

        const lemmaWord = lemma(attribute, word) !== word ? `, ${lemma(attribute, word)}` : ''
        const header  = `<b>${word} (${partOfSpeech(attribute, word)}${lemmaWord})</b>`
        dict.innerHTML = `${header} <ol>${defs}</ol>`
      })
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', myFunction, false)
  }
}

function translation() {
  let btn = document.querySelector('button.translate')
  let el = document.querySelector('.translation')

  let myFunction = function() {
    translate(curSentence.innerText, { from: "en", to: "ru" })
      .then(res => {
        el.innerHTML = res.text
      })
      .catch(err => {
        console.error(err)
        el.innerHTML = err
      })
  }
  btn.addEventListener('click', myFunction, false)
}

const words = {}
function remember() {
  let btn = document.querySelector('button.remember')
  let dict = document.querySelector('.dictionary')

  let myFunction = function() {
    const word = this.getAttribute('data-word')
    words[word] = true

    dict.innerHTML = JSON.stringify(words)
  }
  btn.addEventListener('click', myFunction, false)
}

document.addEventListener("DOMContentLoaded", function(event) {
  main()
  translation()
  remember()
})
