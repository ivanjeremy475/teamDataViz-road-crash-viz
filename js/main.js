/* ==========================================================
   main.js - D3 code for the road crash injuries story

   GEN AI DECLARATION (required by the unit):
   - TODO: replace this with a summary of the prompts you used.
     Example: "Asked Claude for a starter page layout and a basic
     line chart; we then changed the data loading, labels and
     styling ourselves."
   - If you did not use AI for a file, write that here instead.
   ========================================================== */

// Wait until the page has loaded before drawing anything
document.addEventListener("DOMContentLoaded", () => {
  drawTrendChart();
  // TODO: drawRoadUserChart();
  // TODO: drawWhoChart();
});

/* ----------------------------------------------------------
   PLACEHOLDER DATA - NOT REAL FIGURES.
   Replace this by loading the CSV you export from KNIME:
     d3.csv("data/injuries_by_year.csv", d => ({
       year: +d.year,
       injuries: +d.injuries
     })).then(data => drawTrendChart(data));
   ---------------------------------------------------------- */
const placeholderData = d3.range(2011, 2022).map((year, i) => ({
  year: year,
  injuries: 1000 + i * 50   // fake values just to test the layout
}));

/* ----------------------------------------------------------
   Line chart: injuries per year
   ---------------------------------------------------------- */
function drawTrendChart(data = placeholderData) {
  const container = d3.select("#chart-trend");
  const width = 640, height = 360;
  const margin = { top: 20, right: 24, bottom: 40, left: 56 };

  // Remove any earlier drawing so this function can be called again
  container.selectAll("*").remove();

  // Responsive SVG: scales with its container using a viewBox
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "auto");

  // Scales map data values to pixel positions
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.injuries)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(data.length));

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  // Axis label so units are clear
  svg.append("text").attr("class", "axis")
    .attr("x", margin.left).attr("y", 12)
    .text("Hospitalised injuries");

  // The line itself
  const line = d3.line().x(d => x(d.year)).y(d => y(d.injuries));
  svg.append("path").datum(data).attr("class", "line-main").attr("d", line);

  // Dots with tooltips; keyboard focusable for accessibility
  const tooltip = d3.select("#tooltip");

  svg.selectAll(".dot").data(data).join("circle")
    .attr("class", "dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.injuries))
    .attr("r", 5)
    .attr("tabindex", 0)
    .on("mouseover focus", (event, d) => {
      tooltip.style("opacity", 1)
        .text(`${d.year}: ${d3.format(",")(d.injuries)} injuries`);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.clientX + 12) + "px")
             .style("top", (event.clientY - 28) + "px");
    })
    .on("mouseout blur", () => tooltip.style("opacity", 0));
}