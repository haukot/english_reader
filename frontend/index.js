import lemmatize from "wink-lemmatizer"
import { setCORS } from "google-translate-api-browser"

// setting up cors-anywhere server address
const translate = setCORS("http://cors-anywhere.herokuapp.com/")

const backendHost = window.location.origin // 'http://localhost:3000'

let curSentenceEl = null
let curWordEl = null
let state = null
let db = null
// TODO: can use IndexedDB better(e.g. get in RAM only one book at the time)
const defaultState = {
  id: 1,
  words: {},
  currentBook: 0,
  books: [
    {
      pages: [[0, 612]],
      name: "Default book",
      text: "Default Book. \n <span class=\"sentence\">\u201cThe Eye of the World is the <span t=\"j\">best</span> of its <span t=\"n\">genre</span>.\u201d\n\n</span><span class=\"sentence\">\u2014</span><span class=\"sentence\">The Ottawa Citizen\n\n\n\n\u201cA <span t=\"j\">splendid</span> <span t=\"n\">tale</span> of <span t=\"j\">heroic</span> <span t=\"n\">fantasy</span>, <span t=\"j\">vast</span> in <span t=\"n\">scope</span>, <span t=\"j\">colorful</span> in <span t=\"n\">detail</span>, and <span t=\"j\">convincing</span> in its <span t=\"n\">presentation</span> of <span t=\"j\">human</span> <span t=\"n\">character</span> and <span t=\"n\">personality</span>.\u201d\n\n\u2014L. Sprague De Camp\n</span>",
      currentPage: 1
    }
  ]
}

function handleError(err) {
  console.error(err)
  alert(err)
}

function setupState() {
  return new Promise(function(resolve) {
    const DBOpenRequest = indexedDB.open("store", 3)
    DBOpenRequest.onupgradeneeded = function() {
      db = DBOpenRequest.result
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'id' })
      }
    }
    DBOpenRequest.onsuccess = function() {
      db = DBOpenRequest.result
      // set state
      const transaction = db.transaction('state', 'readonly')
      transaction.onerror = handleError
      const stateStore = transaction.objectStore('state')
      const stateRequest = stateStore.get(1)
      stateRequest.onsuccess = () => {
        state = stateRequest.result || defaultState
        resolve()
      }
      stateRequest.onerror = handleError
    }
    DBOpenRequest.onerror = handleError
  })
}

function updateState(newState) {
  state = newState

  const transaction = db.transaction(['state'], 'readwrite')
  transaction.onerror = handleError
  const stateStore = transaction.objectStore('state')
  const stateRequest = stateStore.put(newState)
  stateRequest.onerror = handleError
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
  const book = state.books[state.currentBook]
  const curPage = book.currentPage
  const pages = book.pages
  text.innerHTML = book.text.slice(pages[curPage - 1][0], pages[curPage - 1][1])

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
    if (state.words[elements[i].innerHTML]) {
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
    state.words[curWordEl.innerHTML] = true
    updateState(state)
    curWordEl.classList.add('remembered')

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

function renderRemoveBook() {
  const btns = document.querySelectorAll('.book-delete')

  let myFunction = function() {
    if (state.books.length === 1) return alert('Cant remove last book')

    const id = this.getAttribute('data-bookid')
    state.books.splice(id, 1)
    updateState(state)
    renderBookshelf()
  }

  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', myFunction, false)
  }
}

function renderOpenBook() {
  const btns = document.querySelectorAll('.book-open')
  const menuBtn = document.querySelector('.menu-button')

  let myFunction = function() {
    menuBtn.click() // to hide menu
  }

  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', myFunction, false)
  }
}

function renderBookshelf() {
  const books = document.querySelector('.books')

  const template = function({ idx, currentPage, name }) {
    return `
      <div class="book">
        ${idx + 1}. <a class="book-open" href="#book=${idx}&page=${currentPage}"> ${name} </a>
        <button class="book-delete" data-bookid=${idx}> 🗑 </button>
      </div>`
  }

  const html = state.books.map((book, i) => {
    return template({ idx: i, name: book.name, currentPage: book.currentPage })
  }).join("\n")

  books.innerHTML = html

  renderRemoveBook()
  renderOpenBook()
}

function renderPagination() {
  // insert book
  const div = document.querySelector('.pagination')
  let curPage
  let curBook

  try {
    const params = window.location.hash.split('&')
    curBook = parseInt(params[0].split('=')[1]) || 0
    curPage = parseInt(params[1].split('=')[1]) || 1
    state.currentBook = curBook
    state.books[curBook].currentPage = curPage
  } catch(e) {
    console.error('Error, reset book')
    console.error(e)
    curBook = state.currentBook
    curPage = state.books[curBook].currentPage
  }
  updateState(state)

  const pages = state.books[curBook].pages

  const renderBtn = (page, text=page) => {
    return `<a class="page-btn ${curPage === page && 'active'}" href="#book=${state.currentBook}&page=${page}">${ text }</a>`
  }

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
    setTimeout(() => {
      renderText()
      window.scrollTo(0, 0)
    }, 1)
  }
  for (let i = 0; i < paginationBtns.length; i++) {
    paginationBtns[i].addEventListener('click', myFunction, false)
  }
}

function handleRoutingChange() {
  window.addEventListener('hashchange', function() {
    renderPagination()
    renderText()
  })
}

function afterBookUpload(name, book) {
  state.books.push({
    name,
    text: book.text,
    pages: book.pages,
    currentPage: 1
  })
  updateState(state)
  renderBookshelf()
}

function handleSyncRoute() {
  const file = fileInput.files[0]
  const formData = new FormData()
  formData.append('file', file)
  btn.classList.add('-process')

  const params = window.location.hash.split('&')
  const fileParam = params[0].split('=')
  if (fileParam[0] === '#syncFile') {
    const name = fileParams[1]

    fetch(`${backendHost}/sync?filename=${name}`, {
      method: 'GET'
    }).then(response => response.json())
      .then(response => {
        afterBookUpload(name, response)
      })
      .catch(handleError)
  }
}

function renderUpload() {
  const btn = document.querySelector('button.upload')

  let myFunction = function() {
    const fileInput = document.querySelector('#input-file')
    const file = fileInput.files[0]
    const formData = new FormData()
    formData.append('file', file)
    btn.classList.add('-process')

    const name = file.name

    fetch(`${backendHost}/process`, {
      method: 'POST',
      body: formData
    }).then(response => response.json())
      .then(response => {
        btn.classList.remove('-process')
        afterBookUpload(name, response)
      })
      .catch(handleError)
  }
  btn.addEventListener('click', myFunction, false)
}

document.addEventListener("DOMContentLoaded", function(event) {
  setupState().then(() => {
    renderMenu()
    renderPagination()
    renderText()
    renderTranslation()
    renderRemember()
    renderSound()
    renderUpload()
    renderBookshelf()
    handleRoutingChange()
  })
})
