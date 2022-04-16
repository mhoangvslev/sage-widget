/* file : results-table.js
MIT License

Copyright (c) 2019 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import m from 'mithril'
import { map } from 'lodash'
import { saveAs } from 'file-saver'
const fs = require('fs')

const PAGE_SIZE = 10

function lastPage (results) {
  if (results.length < PAGE_SIZE) {
    return 0
  } else if (results.length % PAGE_SIZE === 0) {
    return (results.length / PAGE_SIZE) - 1
  }
  return Math.floor(results.length / PAGE_SIZE)
}

/**
* Display query results
* @author Thomas Minier
*/
export default function ResultsTable (state) {
  return {
    view: function () {
      return m('div', {class: 'row'}, [
        (state.results.length > 0) ? m('div', {class: 'col-md-12'}, [
          // Title
          m('h3', [
            m('i', {class: 'fas fa-list-ul'}),
            ' Query results'
          ]),
          m('div', { class: 'table-responsive' }, [
            // Table
            m('table', {class: 'table table-striped'}, [
              // headers
              m('thead', [
                m('tr', map(state.results[0], function (value, key) {
                  return m('th', key)
                }))
              ]),
              // Rows
              m('tbody', state.results.slice(state.pageNum * PAGE_SIZE, state.pageNum * PAGE_SIZE + PAGE_SIZE).map(v => {
                return m('tr', map(v, function (value) {
                  // renders URIs as links
                  if (value.startsWith('http')) {
                    return m('td', [
                      m('a', {href: value, target: '_blank'}, `<${value}>`)
                    ])
                  }
                  return m('td', value)
                }))
              }))
            ])
          ])
        ]) : null,
        // Navigation buttons
        (state.results.length > 0) ? m('div', {class: 'mx-auto'}, [
          // back to first page
          (state.pageNum > 0) ? m('button', {class: 'btn btn-primary', onclick: () => { state.pageNum = 0 }}, m('i', {class: 'fas fa-angle-double-left'})) : m('button', {class: 'btn btn-secondary disabled'}, m('i', {class: 'fas fa-angle-double-left'})),
          ' ',
          // go to previous page
          (state.pageNum > 0) ? m('button', {class: 'btn btn-primary', onclick: () => { state.pageNum -= 1 }}, m('i', {class: 'fas fa-angle-left'})) : m('button', {class: 'btn btn-secondary disabled'}, m('i', {class: 'fas fa-angle-left'})),
          // Page number
          ' Page n°' + (state.pageNum + 1) + ' on ' + (lastPage(state.results) + 1) + ' ',
          // go to next page
          (state.pageNum < lastPage(state.results)) ? m('button', {class: 'btn btn-primary', onclick: () => { state.pageNum += 1 }}, m('i', {class: 'fas fa-angle-right'})) : m('button', {class: 'btn btn-secondary disabled'}, m('i', {class: 'fas fa-angle-right'})),
          ' ',
          // go to last page
          (state.pageNum < lastPage(state.results)) ? m('button', {class: 'btn btn-primary', onclick: () => { state.pageNum = lastPage(state.results) }}, m('i', {class: 'fas fa-angle-double-right'})) : m('button', {class: 'btn btn-secondary disabled'}, m('i', {class: 'fas fa-angle-double-right'})),

          // Download results
          m('button', 
            {
              class: 'btn btn-outline-success', 
              onclick: (req, res) => { 
                const str = JSON.stringify(state.results);
                const bytes = new TextEncoder().encode(str);
                const blob = new Blob([bytes], {type: "application/json;charset=utf-8"});
                saveAs(blob, "results.json")
              }
            }, [ m('i', {class: 'fas fa-download'}), ' Download JSON'])
        ]) : null
      ])
    }
  }
}
