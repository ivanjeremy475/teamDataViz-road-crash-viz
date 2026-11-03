/* ==========================================================
   main.js - D3 code for the road crash injuries story

   GEN AI DECLARATION (required by the unit):
   - TODO: replace this with a summary of the prompts you used.
     Example: "Asked Claude to connect our cleaned KNIME CSV to
     the starter charts (annual line chart, road user bar chart,
     age-by-sex grouped bars). We then edited the text, colours
     and labels ourselves."
   - If you did not use AI for a file, write that here instead.

   DATA: data/injuries_clean.csv, produced by our KNIME workflow.
   Rows are ALREADY COUNTS (one row per year, remoteness, age group,
   sex, road user and counterparty), so every chart ADDS UP the
   Hospitalisations column with d3.sum. Counting rows would be wrong.
   Columns: Year, Remoteness, Age_Group, Sex, Road_User,
            Counterparty, Hospitalisations, Bed days, Died_cases
   ========================================================== */

const DATA_FILE = "data/injuries_clean.csv";
const fmt = d3.format(",");

// Colours: blue and amber are colour-blind friendly. Fallbacks are
// used if the CSS variables from style.css are missing.
const BLUE = "var(--blue, #1f5f8b)";
const AMBER = "var(--amber, #c98a00)";

// Wait until the page has loaded, then load the CSV once and draw all charts
document.addEventListener("DOMContentLoaded", () => {
  setupRouter();
  d3.csv(DATA_FILE, d3.autoType)
    .then(data => {
      // Quick sanity check in the browser console (official total is 410,884)
      console.log("Rows:", data.length, "| Total hospitalisations:", d3.sum(data, d => d.Hospitalisations));
      drawTrendChart(data);
      drawRoadUserChart(data);
      drawWhoChart(data);
      fillStats(data);
    })
    .catch(err => {
      console.error("Could not load the data:", err);
      d3.selectAll("#chart-trend, #chart-roadusers, #chart-who")
        .html("<p style='padding:1rem'>Sorry, the data could not be loaded. If you opened this file directly, run a local server (see README).</p>");
    });
});

/* ---------- Shared helpers ---------- */

// Responsive SVG that scales to its container using a viewBox
function makeSvg(selector, width, height) {
  const container = d3.select(selector);
  container.selectAll("*").remove();
  return container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%");
}

// Tooltip that works with the mouse AND the keyboard (focus)
function addTooltip(selection, textFn) {
  const tooltip = d3.select("#tooltip");
  selection
    .attr("tabindex", 0)
    .on("mouseover focus", (event, d) => tooltip.style("opacity", 1).text(textFn(d)))
    .on("mousemove", event => {
      tooltip.style("left", (event.clientX + 12) + "px").style("top", (event.clientY - 28) + "px");
    })
    .on("mouseout blur", () => tooltip.style("opacity", 0));
}

/* ----------------------------------------------------------
   Chart 1: hospitalised injuries per year (line chart)
   ---------------------------------------------------------- */
function drawTrendChart(data) {
  const width = 640, height = 360;
  const margin = { top: 28, right: 24, bottom: 40, left: 60 };

  // Add up Hospitalisations for each year
  const byYear = d3.rollups(data, v => d3.sum(v, d => d.Hospitalisations), d => d.Year)
    .map(([year, injuries]) => ({ year, injuries }))
    .sort((a, b) => a.year - b.year);

  const svg = makeSvg("#chart-trend", width, height);

  const x = d3.scaleLinear().domain(d3.extent(byYear, d => d.year)).range([margin.left, width - margin.right]);
  // Axis starts at 0 so the size of the change is not exaggerated
  const y = d3.scaleLinear().domain([0, d3.max(byYear, d => d.injuries)]).nice().range([height - margin.bottom, margin.top]);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(byYear.length));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));
  svg.append("text").attr("class", "chart-label").attr("x", margin.left).attr("y", 14).text("Hospitalised injuries per year");

  svg.append("path").datum(byYear).attr("class", "line-main")
    .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.injuries)));

  const dots = svg.selectAll(".dot").data(byYear).join("circle")
    .attr("class", "dot").attr("cx", d => x(d.year)).attr("cy", d => y(d.injuries)).attr("r", 5);
  addTooltip(dots, d => `${d.year}: ${fmt(d.injuries)} injuries`);

  // Annotation for the 2020 dip (the data shows a fall; we do not claim a cause here)
  const p2020 = byYear.find(d => d.year === 2020);
  if (p2020) {
    svg.append("text").attr("class", "chart-label").attr("x", x(2020)).attr("y", y(p2020.injuries) + 26)
      .attr("text-anchor", "middle").text("2020 dip");
  }
}

/* ----------------------------------------------------------
   Chart 2: total injuries by road user (horizontal bar chart)
   ---------------------------------------------------------- */
function drawRoadUserChart(data) {
  const width = 640, height = 420;
  const margin = { top: 16, right: 70, bottom: 36, left: 210 };

  const byUser = d3.rollups(data, v => d3.sum(v, d => d.Hospitalisations), d => d.Road_User)
    .map(([user, injuries]) => ({ user, injuries }))
    .sort((a, b) => b.injuries - a.injuries);

  const svg = makeSvg("#chart-roadusers", width, height);

  const x = d3.scaleLinear().domain([0, d3.max(byUser, d => d.injuries)]).nice().range([margin.left, width - margin.right]);
  const y = d3.scaleBand().domain(byUser.map(d => d.user)).range([margin.top, height - margin.bottom]).padding(0.2);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0));

  // Motorcyclists and pedal cyclists are highlighted in amber (see figure caption)
  const highlight = new Set(["Motorcyclist", "Pedal cyclist"]);
  const bars = svg.selectAll(".bar").data(byUser).join("rect")
    .attr("class", "bar")
    .attr("x", x(0)).attr("y", d => y(d.user))
    .attr("width", d => x(d.injuries) - x(0)).attr("height", y.bandwidth())
    .attr("fill", d => highlight.has(d.user) ? AMBER : BLUE);
  addTooltip(bars, d => `${d.user}: ${fmt(d.injuries)} injuries (2011-2021)`);

  // Value labels at the end of each bar
  svg.selectAll(".val").data(byUser).join("text").attr("class", "chart-label")
    .attr("x", d => x(d.injuries) + 6).attr("y", d => y(d.user) + y.bandwidth() / 2 + 4)
    .text(d => fmt(d.injuries));
}

/* ----------------------------------------------------------
   Chart 3: injuries by age group and sex (grouped bar chart)
   ---------------------------------------------------------- */
function drawWhoChart(data) {
  const width = 640, height = 380;
  const margin = { top: 34, right: 24, bottom: 44, left: 60 };

  // Keep Female and Male only; the tiny "intersex or indeterminate or missing"
  // group and the single "Missing" age row are left out (mention in your notes)
  const ageOrder = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
  const sexes = ["Female", "Male"];
  const clean = data.filter(d => sexes.includes(d.Sex) && ageOrder.includes(d.Age_Group));

  const sums = d3.rollup(clean, v => d3.sum(v, d => d.Hospitalisations), d => d.Age_Group, d => d.Sex);
  const rows = ageOrder.flatMap(age => sexes.map(sex => ({ age, sex, injuries: sums.get(age)?.get(sex) ?? 0 })));

  const svg = makeSvg("#chart-who", width, height);

  const x0 = d3.scaleBand().domain(ageOrder).range([margin.left, width - margin.right]).paddingInner(0.2);
  const x1 = d3.scaleBand().domain(sexes).range([0, x0.bandwidth()]).padding(0.08);
  const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.injuries)]).nice().range([height - margin.bottom, margin.top]);
  const color = d3.scaleOrdinal().domain(sexes).range([BLUE, AMBER]);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x0));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));
  svg.append("text").attr("class", "chart-label").attr("x", width / 2).attr("y", height - 6).attr("text-anchor", "middle").text("Age group (years)");

  const bars = svg.selectAll(".bar").data(rows).join("rect").attr("class", "bar")
    .attr("x", d => x0(d.age) + x1(d.sex)).attr("y", d => y(d.injuries))
    .attr("width", x1.bandwidth()).attr("height", d => y(0) - y(d.injuries))
    .attr("fill", d => color(d.sex));
  addTooltip(bars, d => `${d.sex}, age ${d.age}: ${fmt(d.injuries)} injuries (2011-2021)`);

  // Legend (colour is also explained in the tooltip, so colour is not the only cue)
  sexes.forEach((sex, i) => {
    const g = svg.append("g").attr("transform", `translate(${margin.left + i * 90},10)`);
    g.append("rect").attr("width", 14).attr("height", 14).attr("fill", color(sex));
    g.append("text").attr("class", "chart-label").attr("x", 20).attr("y", 12).text(sex);
  });
}

/* ----------------------------------------------------------
   Page navigation: each nav link shows its own "page" (view).
   One HTML file, switched by the #hash in the address bar, so
   the back button and shared links still work.
   ---------------------------------------------------------- */
function setupRouter() {
  const views = document.querySelectorAll(".view");
  const links = document.querySelectorAll("nav a[data-view]");
  const baseTitle = document.title;

  function show() {
    let id = location.hash.slice(1);
    if (!document.getElementById(id) || !document.getElementById(id).classList.contains("view")) id = "overview";
    views.forEach(v => v.classList.toggle("active", v.id === id));
    links.forEach(a => {
      if (a.dataset.view === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const view = document.getElementById(id);
    document.title = `${view.dataset.title} | ${baseTitle}`;
    window.scrollTo(0, 0);
    const heading = view.querySelector("h1, h2");   // move focus for screen-reader and keyboard users
    if (heading) heading.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", show);
  show();
}

/* Headline numbers on the overview page, calculated from the data */
function fillStats(data) {
  const total = d3.sum(data, d => d.Hospitalisations);
  const sumWhere = test => d3.sum(data.filter(test), d => d.Hospitalisations);
  const y2011 = sumWhere(d => d.Year === 2011), y2021 = sumWhere(d => d.Year === 2021);
  const cyc = sumWhere(d => d.Road_User === "Motorcyclist" || d.Road_User === "Pedal cyclist");
  const male = sumWhere(d => d.Sex === "Male"), female = sumWhere(d => d.Sex === "Female");
  const pct = d3.format(".0%");
  d3.select("#stat-total").text(fmt(total));
  d3.select("#stat-change").text("+" + pct(y2021 / y2011 - 1));
  d3.select("#stat-cyc").text(pct(cyc / total));
  d3.select("#stat-male").text(pct(male / (male + female)));
}