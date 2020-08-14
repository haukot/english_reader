import { setCORS } from "google-translate-api-browser";
// setting up cors-anywhere server address
const translate = setCORS("http://cors-anywhere.herokuapp.com/");


function main() {
  let elements = document.querySelectorAll('.text span')
  let dict = document.querySelector('.dictionary')
  let rememberBtn = document.querySelector('button.remember')

  let funcs = {
    x: 'lookup',
    n: 'lookupNoun',
    j: 'lookupAdjective',
    d: 'lookupAdverb',
    v: 'lookupVerb',
  }

  let myFunction = function() {
    let word = this.innerHTML
    rememberBtn.setAttribute('data-word', word)

    let attribute = this.getAttribute("t")
    wordpos[funcs[attribute]](word)
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
        dict.innerHTML = `<b>${word}</b> <ol>${defs}</ol>`
      })
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', myFunction, false)
  }
}

function translation() {
  let btn = document.querySelector('button.translate')
  let text = document.querySelector('.text')
  let dict = document.querySelector('.dictionary')

  let myFunction = function() {
    translate(text.innerText, { from: "en", to: "ru" })
      .then(res => {
        dict.innerHTML = res.text
      })
      .catch(err => {
        console.error(err)
        dict.innerHTML = err
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
