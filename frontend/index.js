import lemmatize from "wink-lemmatizer"
import { setCORS } from "google-translate-api-browser"
import { book, pages } from "./book"

// setting up cors-anywhere server address
const translate = setCORS("http://cors-anywhere.herokuapp.com/")

let curSentenceEl = null
let curWordEl = null
let curPage = 1
// localStorage
const words = JSON.parse(localStorage.words || '{}')

function handleError(err) {
  console.error(err)
  alert(err)
}

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

function hide(el) {
  el.classList.add('hidden')
}

function show(el) {
  el.classList.remove('hidden')
}

function clearDict() {
  if (curWordEl) curWordEl.classList.remove('active')
  if (curSentenceEl) curSentenceEl.classList.remove('active')
  const dictCont = document.querySelector('.dictionary-container')
  hide(dictCont)
}

function showDict() {
  const dictCont = document.querySelector('.dictionary-container')

  const rect = curSentenceEl.getBoundingClientRect()
  dictCont.classList.remove('-top')
  dictCont.classList.remove('-bottom')
  if (rect.bottom > (window.innerHeight / 2)) {
    dictCont.classList.add('-top')
  } else {
    dictCont.classList.add('-bottom')
  }

  show(dictCont)
}

function renderText() {
  const text = document.querySelector('.text')
  text.innerHTML = book.slice(pages[curPage - 1][0], pages[curPage - 1][1])

  // process spans
  let elements = document.querySelectorAll('.text span:not(.sentence)')
  let dict = document.querySelector('.dictionary')
  let rememberBtn = document.querySelector('button.remember')

  let myFunction = function() {
    clearDict()

    curWordEl = this
    const newSentenceEl = this.closest('.sentence')
    if (curSentenceEl !== newSentenceEl) {
      // прячем перевод, если другое предложение выделили.
      const translationEl = document.querySelector('.translation')
      translationEl.innerHTML = ''
      hide(translationEl)
    }

    curSentenceEl = newSentenceEl
    curWordEl.classList.add('active')
    curSentenceEl.classList.add('active')

    let word = this.innerHTML

    let attribute = this.getAttribute("t")
    lookup(attribute, word)
      .then(res => {
        // console.log('HUI', res)
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
        showDict()
      }).catch(handleError)
  }

  for (let i = 0; i < elements.length; i++) {
    if (words[elements[i].innerHTML]) {
      elements[i].classList.add('remembered')
    }
    elements[i].addEventListener('click', myFunction, false)
  }

  // to drop selection
  document.addEventListener('click', ({ target }) => {
    if (!target.closest('.text span, .dictionary-container')) {
      clearDict()
    }
  })
}

function renderTranslation() {
  let btn = document.querySelector('button.translate')
  let el = document.querySelector('.translation')

  let myFunction = function() {
    btn.classList.add('-process')
    translate(curSentenceEl.innerText, { from: "en", to: "ru" })
      .then(res => {
        el.innerHTML = res.text
        show(el)
        btn.classList.remove('-process')
      })
      .catch(handleError)
  }
  btn.addEventListener('click', myFunction, false)
}

function renderRemember() {
  let btn = document.querySelector('button.remember')
  let dict = document.querySelector('.dictionary')

  let myFunction = function() {
    words[curWordEl.innerHTML] = true
    curWordEl.classList.add('remembered')

    localStorage.words = JSON.stringify(words)
    btn.classList.add('-success')
    setTimeout(() => btn.classList.remove('-success'), 500)
  }
  btn.addEventListener('click', myFunction, false)
}

function renderSound() {
  let btn = document.querySelector('button.sound')

  let myFunction = function() {
    const word = curWordEl.innerHTML.toLowerCase()
    const player = new Audio(`https://voice.reverso.net/RestPronunciation.svc/v1/output=json/GetVoiceStream/voiceName=Heather22k?mp3BitRate=64&inputText=${btoa(word)}`)
    player.play()
  }
  btn.addEventListener('click', myFunction, false)
}

function renderMenu() {
  const btn = document.querySelector('.menu-button')
  const menuCont = document.querySelector('.menu-container')
  const bookCont = document.querySelector('.book-container')

  let myFunction = function() {
    if (menuCont.classList.contains('hidden')) {
      show(menuCont)
      hide(bookCont)
    } else {
      hide(menuCont)
      show(bookCont)
    }
  }
  btn.addEventListener('click', myFunction, false)
}

function renderPagination() {
  // insert book
  const div = document.querySelector('.pagination')
  const renderBtn = (page, text=page) => {
    return `<a class="page-btn ${curPage === page && 'active'}" href="#page=${page}">${ text }</a>`
  }
  // That works only for one parameter!
  curPage = parseInt(window.location.hash.split('=')[1]) || 1

  const pageBtns = [renderBtn(1)]
  if (curPage > 2) pageBtns.push(renderBtn(curPage - 1, '<< Prev'))
  if (curPage > 1) pageBtns.push(renderBtn(curPage))
  if (pages.length > curPage + 1) pageBtns.push(renderBtn(curPage + 1, 'Next >>'))
  if (pages.length > curPage) pageBtns.push(renderBtn(pages.length))

  const pagesHTML = pageBtns.join('&nbsp')

  div.innerHTML = pagesHTML

  const paginationBtns = document.querySelectorAll('.pagination .page-btn')

  const myFunction = function() {
    setTimeout(renderPagination, 1)
    setTimeout(renderText, 1)
  }
  for (let i = 0; i < paginationBtns.length; i++) {
    paginationBtns[i].addEventListener('click', myFunction, false)
  }
}

function renderUpload() {
  const btn = document.querySelector('button.upload')

  let myFunction = function() {
    const fileInput = document.querySelector('#input-file')
    const file = fileInput.files[0]
    const formData = new FormData()
    formData.append('file', file)

    fetch('http://localhost:3000/process', {
      method: 'POST',
      body: formData
    }).then(response => response.json())
      .then(success => console.log('HUI', success))
      .catch(handleError)
  }
  btn.addEventListener('click', myFunction, false)
}

document.addEventListener("DOMContentLoaded", function(event) {
  renderMenu()
  renderPagination()
  renderText()
  renderTranslation()
  renderRemember()
  renderSound()
  renderUpload()
})
