/* global window */
(function initCanvasGeometry(global) {
  const BASE_FLEX_GEOMETRY = Object.freeze({
    positionMode: 'fixedCenter',
    xScale: 1.0075,
    xOffset: 0,
    yScale: 1.7857142857,
    yOffset: 0,
  })

  function getBaseFlexGeometry() {
    return { ...BASE_FLEX_GEOMETRY }
  }

  global.DVIPCanvasGeometry = {
    BASE_FLEX_GEOMETRY,
    getBaseFlexGeometry,
  }
}(window))
