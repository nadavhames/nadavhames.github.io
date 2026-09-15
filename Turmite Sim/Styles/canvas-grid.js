//https://github.com/vicentedealencar/canvas-grid
function canvasGrid(canvasId, dataMatrix) {
  var c = document.getElementById(canvasId);
  var ctx = c.getContext("2d");

  // The simulation names its cells white, black and red. They're drawn in the site's
  // theme colours instead, so the grid fits the page in light and dark mode alike.
  var palette = {};
  function readPalette() {
    var css = getComputedStyle(document.documentElement);
    palette = {
      white: css.getPropertyValue("--surface").trim(),
      black: css.getPropertyValue("--text").trim(),
      red: css.getPropertyValue("--accent").trim(),
    };
  }
  readPalette();

  function draw() {
    var mHeight = dataMatrix.length;
    var mWidth = matrixWidth();
    var cellHeight = c.height / mHeight;
    var cellWidth = c.width / mWidth;

    for (var i in dataMatrix) {
      for (var j in dataMatrix[i]) {
        ctx.fillStyle = palette[dataMatrix[i][j]] || dataMatrix[i][j];
        ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
      }
    }
  }
  draw();

  //Object.observe(dataMatrix, function () {
  watch(dataMatrix, function () {
    draw();
  });

  function repaint() {
    readPalette();
    draw();
  }
  new MutationObserver(repaint).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", repaint);

  function matrixWidth() {
    var w = 0;
    for (var i in dataMatrix) {
      if (w < dataMatrix[i].length) w = dataMatrix[i].length;
    }
    return w;
  }
}
