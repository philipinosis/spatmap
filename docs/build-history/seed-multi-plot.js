/* SpatMap v2 — multi-plot QA seed.
 * Builds the Brightside farm, then clones its plot into 3 total plots tiled
 * left-to-right with a world-unit channel between them, so Phase-2 work
 * (seamless pan into the adjacent plot, neighbor slivers, breadcrumb) has real
 * adjacency to test against.
 *
 * Usage (Playwright / console):
 *   <inject this file's contents>      // defines window.seedMultiPlot
 *   window.seedMultiPlot();            // builds the 3-plot farm + fits the canvas
 *
 * Safe to run in the browser (uses Date.now/Math.random via uid()). Relies on the
 * app's own globals: uid, ensureSpatialIndex, rebuildLineIds, reindexLines, commit,
 * fitToContent, getFarm, loadBrightside (all confirmed global, non-IIFE build).
 */
window.seedMultiPlot = function seedMultiPlot(opts){
  opts = opts || {};
  var CHANNEL = opts.channel || 40;          // world-unit gap between plot cards
  var NAMES = opts.names || ['North Plot', 'East Plot', 'South Reef'];

  window.SpatMapDebug.loadBrightside();
  var farm = window.SpatMapDebug.getFarm();

  // Plot 0 already exists (the Brightside plot). Rename it and keep its lines.
  var p0 = farm.plots[0];
  p0.name = NAMES[0];
  var a0 = p0.areas[0];
  var srcLines = farm.lines.filter(function(l){ return l.areaId === a0.id; });

  function cloneLine(src, plotId, areaId){
    var l = JSON.parse(JSON.stringify(src));
    l.id = uid();
    l.plotId = plotId;
    l.areaId = areaId;
    (l.cages || []).forEach(function(c){
      c.id = uid();
      if (c.batch){
        c.batch = JSON.parse(JSON.stringify(c.batch));
        c.batch.id = uid();
        farm.batches.push(c.batch);
        c.events = (c.events || []).map(function(e){
          e = JSON.parse(JSON.stringify(e)); e.id = uid();
          if (e.batchId) e.batchId = c.batch.id;
          return e;
        });
      } else {
        c.events = [];
      }
    });
    return l;
  }

  // Build plots 1..N by cloning a rotating subset of the source lines.
  var subsetSizes = [5, 4];   // plot1 gets 5 lines, plot2 gets 4
  for (var pi = 1; pi <= subsetSizes.length; pi++){
    var x = p0.x + pi * (p0.w + CHANNEL);
    var plot = { id:uid(), name: NAMES[pi] || ('Plot ' + (pi+1)), order: farm.plots.length,
      x:x, y:p0.y, w:p0.w, h:p0.h, areas:[] };
    var area = { id:uid(), name:'Area 1', order:0, plotId:plot.id,
      x: x + (a0.x - p0.x), y:a0.y, w:a0.w, h:a0.h, rot:0, axis:a0.axis,
      lineCount:0, cagesPerLine:a0.cagesPerLine, spacing:a0.spacing, lineIds:[] };
    plot.areas.push(area);
    farm.plots.push(plot);

    var take = subsetSizes[pi-1];
    for (var li = 0; li < take; li++){
      var src = srcLines[(li + pi) % srcLines.length];   // rotate so plots differ
      farm.lines.push(cloneLine(src, plot.id, area.id));
    }
  }

  ensureSpatialIndex(farm);
  reindexLines(farm);
  rebuildLineIds(farm);
  commit();
  try { window.SpatMapDebug.enterOverview(); } catch(e){}
  try { fitToContent(farm); } catch(e){}
  window.SpatMapDebug.render();

  return {
    plots: farm.plots.map(function(p){ return { name:p.name, x:p.x, w:p.w,
      lines: farm.lines.filter(function(l){ return l.plotId === p.id; }).length }; }),
    totalLines: farm.lines.length
  };
};
