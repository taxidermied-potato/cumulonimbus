// https://cumulonimbus.alyin.workers.dev/

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond with a variant, based on A/B testing paradigm
 * @param {Request} request
 */
async function handleRequest(request) {
  let res = await fetch('https://cfw-takehome.developers.workers.dev/api/variants')
  if (res.ok) {
    let data = await res.json()
    let a = await getVariant(data.variants[0])
    let b = await getVariant(data.variants[1])
    let cookie = getCookie(request, 'SAVED_VARIANT')

    // A/B testing seems less (negligibly so) performant for this specific use case, but I imagine it proves useful for other situations

    switch (cookie) {
      case data.variants[0]:
        return a
      case data.variants[1]:
        return b
      default: {
        const random = Math.floor(Math.random() * 2)
        let response = random ? b : a
        let tomorrow = (date => new Date(date.setDate(date.getDate() + 1)))(new Date)
        response = new Response(response.body, response)
        response.headers.append('Set-Cookie', `SAVED_VARIANT=${data.variants[random]}; Expires=${tomorrow.toGMTString()} GMT; Path='/'`)
        return response
      }
    }
  }
  else {
    return new Response('API fetch failed', {
      headers: { 'content-type': 'text/plain' },
    })
  }
}

/**
 * Customizes and returns a variant markup response
 * @param {string} url of variant
 */
async function getVariant(url) {
  let variant = await fetch(url)
  if (variant.ok) {
    let rewrite = rewriteHTML(variant, url.charAt(url.length - 1))
    let html = await rewrite.text()

    // Injecting a bit of custom style
    const customStyle = url.charAt(url.length - 1) == 1 ? 
    `<style type="text/css"> body {background-image: url(\'https://s6.gifyu.com/images/light.gif\'); background-size: auto 33%; background-position: center;} 
    .opacity-75 {opacity: .5; background: rgb(236, 236, 248)} </style></body>`
    :
    `<style type="text/css"> body {background-image: url(\'https://s6.gifyu.com/images/dark.gif\'); background-size: auto 33%; background-position: center;}
    .opacity-75 {opacity: .8; background: rgb(36, 36, 48)} .bg-white{background: rgb(42, 42, 58)}
    .text-gray-900 {color: white} .text-gray-500 {color: #a9b2c9} .bg-green-600 {background: #ffa348} 
    .bg-green-600:hover {background: #ffb036} .bg-green-600:focus {border-color: #ffb036} </style></body>`
    html = html.replace(/<\/body>/, customStyle)

    return new Response(html, {
      headers: {
        'content-type': 'text/html'
      },
    })
  }
  else {
    return new Response('Variant fetch failed', {
      headers: { 'content-type': 'text/plain' },
    })
  }
}

/**
 * Rewrites HTML
 * @param {Response} variant response
 * @param {Number} variantNum type of variant
 */
function rewriteHTML(variant, variantNum) {
  return new HTMLRewriter()
    .on('title', { element: e => e.setInnerContent('Cumulonimbus | Cloudflare Application ') })
    .on('h1#title', { element: e => e.setInnerContent((variantNum == 1 ? 'Variant 1: Cumulus' : 'Variant 2: Nimbus')) })
    .on('p#description', {
      element: e => e.setInnerContent(
        'If you like this, you\'d probably prefer the ' + (variantNum == 1 ? 'light' : 'dark') + ' theme on my latest project, a customizable COVID-19 dashboard.'
      )
    })
    .on('a#url', {
      element: e => {
        e.setInnerContent('Visit Coronatrack')
        e.setAttribute("href", (variantNum == 1 ? "https://altyin.com/coronatrack?theme=light" : "https://altyin.com/coronatrack"))
      }
    })
    .transform(variant)
}

/**
 * Grabs the cookie with name from the request headers
 * @param {Request} request incoming Request
 * @param {string} name of the cookie to grab
 */
function getCookie(request, name) {
  let result = null
  let cookieString = request.headers.get('Cookie')
  if (cookieString) {
    let cookies = cookieString.split(';')
    cookies.forEach(cookie => {
      let cookieName = cookie.split('=')[0].trim()
      if (cookieName === name) {
        result = cookie.split('=')[1]
      }
    })
  }
  return result
}
