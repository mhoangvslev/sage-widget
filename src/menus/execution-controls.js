/* file : execution-controls.js
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
import GraphqlCompiler from '../graphql/compiler'

const MAX_BUCKET_SIZE = 10

/**
 * Stub the HTTP client to measure HTTP requests
 */
function _stubRequestClient (sageClient, spy, state) {
  const sendRequest = sageClient._graph._httpClient._httpClient.post
  sageClient._graph._httpClient._httpClient.post = (params, cb) => {
    sendRequest(params, function (err, res, body) {
      const now = Date.now()
      state.executionTime = (now - state.startTime) / 1000
      state.httpCalls = spy.nbHTTPCalls
      state.avgServerTime = spy.avgResponseTime
      cb(err, res, body)
    })
  }
}

const graphqlCompiler = new GraphqlCompiler()

// Control SPARQL query execution
export default function ExecutionControls (state) {
  function compileShow () {
    if (state.graphqlMode) {
      // TODO check if the GraphQL query and context are well formed
      const context = JSON.parse(state.graphqlContext)
      state.currentQueryValue = graphqlCompiler.compile(state.graphqlQuery, context['@context'])
      state.currentQueryName = 'Generated from a GraphQL query'
      state.graphqlMode = false
      $('#sparqlTab').tab('show')
    }
  }

  function executeQuery () {
    // In GraphQL mode: first compile the GraphQL query into SPARQL
    if (state.graphqlMode) {
      // TODO check if the GraphQL query and context are well formed
      const context = JSON.parse(state.graphqlContext)
      state.currentQueryValue = graphqlCompiler.compile(state.graphqlQuery, context['@context'])
    }
    if (state.currentQueryValue !== null) {
      // reset results array & page number
      state.results = []
      state.pageNum = 0
      state.executionTime = 0
      // bucket used to buffer results
      state.bucket = []
      state.spy = new sage.Spy()
      state.currentClient = new sage.SageClient(state.currentDataset, state.spy)
      _stubRequestClient(state.currentClient, state.spy, state)
      state.currentIterator = state.currentClient.execute(state.currentQueryValue)
      // set starting time
      state.startTime = Date.now()
      _subscribe()
    }
  }

  function _subscribe () {
    // open HTTP client & start query processing
    state.currentClient._graph.open()
    state.isRunning = true
    state.subscription = state.currentIterator.subscribe(function (b) {
      if (state.isRunning) {
        if ('toObject' in b) {
          b = b.toObject()
        }
        state.bucket.push(b)
        if (state.bucket.length >= MAX_BUCKET_SIZE) {
          state.bucket.forEach(v => {
            state.results.push(v)
          })
          state.bucket = []
          m.redraw()
        }
      }
    }, console.error, function () {
      // update stats after completion
      const now = Date.now()
      state.executionTime = (now - state.startTime) / 1000
      state.httpCalls = state.spy.nbHTTPCalls
      state.avgServerTime = state.spy.avgResponseTime
      // cleanup
      state.isRunning = false
      state.subscription = null
      // push last results
      if (state.bucket.length > 0) {
        state.bucket.forEach(v => {
          state.results.push(v)
        })
      }
      m.redraw()
    })
  }

  function pauseQuery () {
    if (state.pauseStatus === 'Pause') {
      stopQuery()
      state.pauseStatus = 'Resume'
    } else {
      _subscribe()
      state.pauseStatus = 'Pause'
    }
  }

  function stopQuery () {
    state.isRunning = false
    if (state.subscription !== null) {
      state.subscription.unsubscribe()
      state.currentClient._graph.close()
    }
  }

  return {
    view: function () {
      return m('div', {class: 'QueryExecutor'}, [
        m('div', {class: 'row'}, [
          m('div', {class: 'col-md-12'}, [
            (state.isRunning || state.pauseStatus === 'Resume') ? m('span', [
              m('button', {
                class: 'btn btn-warning',
                onclick: pauseQuery
              }, (state.pauseStatus === 'Pause') ? [
                m('i', {class: 'fas fa-stop'}),
                ' Pause'
              ] : [
                m('i', {class: 'fas fa-stop'}),
                ' Resume'
              ]),
              ' ',
              m('button', {
                class: 'btn btn-danger',
                onclick: stopQuery
              }, [
                m('i', {class: 'fas fa-times-circle'}),
                ' Stop'
              ])
            ]) : m('span', [
              m('button', {
                class: 'btn btn-success',
                onclick: executeQuery
              }, [
                m('i', {class: 'fas fa-play'}),
                ' Execute'
              ]),
              ' ',
              (state.graphqlMode) ? m('button', {
                class: 'btn btn-primary',
                onclick: compileShow
              }, [
                m('i', {class: 'fas fa-cogs'}),
                ' Compile to SPARQL'
              ]) : null
            ])
          ])
        ])
      ])
    }
  }
}
