/* ==========================================================
   main.js - D3 code for the road crash injuries story

   GEN AI DECLARATION (required by the unit):
   - TODO: replace this with a summary of the prompts you used.
     Example: "Asked Claude to connect our cleaned KNIME CSV to
     the starter charts. We then edited the text, colours
     and labels ourselves."

   DATA: Multiple CSV files from the KNIME workflow are used.
   Each chart reads its own file. The code is written defensively 
   to handle column names with special characters (like + or () ).
   ========================================================== */

// --- Data Files ---
const DATA_FILE = "data/injuries_clean.csv";

// Trend page
const FILE_ANNUAL = "data/workflow1_annualTrend.csv";
const FILE_STAYLEN = "data/workfloe1_hospilatStaylength.csv";
const FILE_REMOTE = "data/Workflow1-emoteness.csv";
const FILE_AGEYEAR = "data/Workflow1Hospitalization&beddayByAgegroup.csv";

// Road Users page
const FILE_RU_TREND = "data/Workflow2_Statetrends.csv";
const FILE_RU_AGE = "data/Workflow2_agebystate.csv";
const FILE_RU_CP = "data/Workflow2_counterpartybystate.csv";
const FILE_RU_USER = "data/Workflow2_roaduserbystate.csv";
const FILE_RU_SEX = "data/Workflow2_SexnStatetrend.csv";
const FILE_RU_COMP = "data/Workflow2_State comparison.csv";

// Who is affected page
const FILE_FN_REMOTE = "data/Workflow3_By remoteness.csv";
const FILE_FN_AGE = "data/Workflow3_Byage.csv";
const FILE_FN_RU = "data/Workflow3_ByRoaduser.csv";
const FILE_FN_TREND = "data/Workflow3_FirstNationsvsNon-Indigenous.csv";

const fmt = d3.format(",");
const COLOR_BLUE = "var(--blue, #1f5f8b)";
const COLOR_AMBER = "var(--amber, #c98a00)";

// Wait until the page has loaded, then load the CSVs and draw the charts
document.addEventListener("DOMContentLoaded", () => {
  setupRouter();

  // --- Main data (Overview Stats) ---
  d3.csv(DATA_FILE, d3.autoType)
    .then(fillStats)
    .catch((e) => console.error("Main data error:", e));

  // --- Trend Page Data ---
  d3.csv(FILE_ANNUAL, d3.autoType)
    .then(drawTrendChart)
    .catch((e) => console.error("Annual error:", e));
  d3.csv(FILE_STAYLEN, d3.autoType)
    .then(drawStayLengthChart)
    .catch((e) => console.error("StayLength error:", e));
  d3.csv(FILE_REMOTE, d3.autoType)
    .then(drawRemotenessChart)
    .catch((e) => console.error("Remoteness error:", e));
  d3.csv(FILE_AGEYEAR, d3.autoType)
    .then(drawAgeChart)
    .catch((e) => console.error("AgeGroup error:", e));

  // --- Road Users Page Data ---
  d3.csv(FILE_RU_COMP, d3.autoType)
    .then(drawStateTrend)
    .catch((e) => console.error("StateTrend error:", e));
  d3.csv(FILE_RU_USER, d3.autoType)
    .then(drawRoadUserState)
    .catch((e) => console.error("RoadUserState error:", e));
  d3.csv(FILE_RU_CP, d3.autoType)
    .then(drawCounterparty)
    .catch((e) => console.error("Counterparty error:", e));
  d3.csv(FILE_RU_SEX, d3.autoType)
    .then(drawSexState)
    .catch((e) => console.error("SexState error:", e));
  d3.csv(FILE_RU_TREND, d3.autoType)
    .then(drawSmallMultiples)
    .catch((e) => console.error("SmallMultiples error:", e));
  d3.csv(FILE_RU_AGE, d3.autoType)
    .then(drawAgeState)
    .catch((e) => console.error("AgeState error:", e));

  // --- Who is affected Page Data ---
  d3.csv(FILE_FN_TREND, d3.autoType)
    .then(drawFNTrend)
    .catch((e) => console.error("FN Trend error:", e));
  d3.csv(FILE_FN_AGE, d3.autoType)
    .then(drawFNAge)
    .catch((e) => console.error("FN Age error:", e));
  d3.csv(FILE_FN_RU, d3.autoType)
    .then(drawFNRoadUser)
    .catch((e) => console.error("FN RoadUser error:", e));
  d3.csv(FILE_FN_REMOTE, d3.autoType)
    .then(drawFNRemoteness)
    .catch((e) => console.error("FN Remoteness error:", e));
  d3.csv(FILE_FN_TREND, d3.autoType)
    .then(drawFNShare)
    .catch((e) => console.error("FN Share error:", e));
});

/* ---------- Shared Helpers ---------- */

function makeSvg(selector, width, height) {
  const container = d3.select(selector);
  if (container.empty()) return null; // Skip if element doesn't exist on current page
  container.selectAll("*").remove();
  return container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("preserveAspectRatio", "xMidYMid meet");
}

function addTooltip(selection, textFn) {
  if (!selection) return;
  const tooltip = d3.select("#tooltip");
  selection
    .attr("tabindex", 0)
    .on("mouseover focus", (event, d) =>
      tooltip.style("opacity", 1).text(textFn(d)),
    )
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.clientX + 12 + "px")
        .style("top", event.clientY - 28 + "px");
    })
    .on("mouseout blur", () => tooltip.style("opacity", 0));
}

function num(v) {
  if (v === undefined || v === null) return 0;
  const n = +String(v).replace(/,/g, "");
  return Number.isFinite(n) ? n : 0;
}

function getHospColumn(obj, prefix) {
  const keys = Object.keys(obj);
  const key = keys.find(
    (k) => k.includes(prefix) && k.includes("hospitalization"),
  );
  return key ? num(obj[key]) : 0;
}

/* ==========================================================
   TREND PAGE — 4 Charts
   ========================================================== */

function drawTrendChart(data) {
  const width = 640,
    height = 320;
  const margin = { top: 28, right: 24, bottom: 40, left: 60 };

  const byYear = data
    .map((d) => ({
      year: num(d.Year),
      injuries: num(d.Hospitalisations),
    }))
    .filter((d) => d.year > 0)
    .sort((a, b) => a.year - b.year);

  const svg = makeSvg("#chart-trend", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(byYear, (d) => d.year))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(byYear, (d) => d.injuries)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(byYear.length));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  svg
    .append("text")
    .attr("class", "chart-label")
    .attr("x", margin.left)
    .attr("y", 14)
    .text("Hospitalised injuries per year");

  svg
    .append("path")
    .datum(byYear)
    .attr("class", "line-main")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.injuries)),
    );

  const dots = svg
    .selectAll(".dot")
    .data(byYear)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.injuries))
    .attr("r", 5);
  addTooltip(dots, (d) => `${d.year}: ${fmt(d.injuries)} injuries`);

  const p2020 = byYear.find((d) => d.year === 2020);
  if (p2020) {
    svg
      .append("text")
      .attr("class", "chart-label")
      .attr("x", x(2020))
      .attr("y", y(p2020.injuries) + 26)
      .attr("text-anchor", "middle")
      .text("2020 dip");
  }
}

function drawStayLengthChart(data) {
  const width = 640,
    height = 340;
  const margin = { top: 44, right: 80, bottom: 40, left: 70 };

  const rows = data
    .map((d) => ({
      year: num(d.Year),
      hosp: num(d["Sum(Hospitalisations)"] || d.Hospitalisations),
      beds: num(d["Sum(Bed days)"] || d.Bed_Days),
    }))
    .filter((d) => d.year > 0)
    .sort((a, b) => a.year - b.year);

  const svg = makeSvg("#chart-staylength", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(rows, (d) => d.year))
    .range([margin.left, width - margin.right]);
  const yH = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.hosp)])
    .nice()
    .range([height - margin.bottom, margin.top]);
  const yB = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.beds)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(rows.length));

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yH).ticks(5).tickFormat(d3.format(",")));
  svg
    .append("text")
    .attr("class", "chart-label")
    .attr("x", margin.left)
    .attr("y", 14)
    .attr("fill", COLOR_BLUE)
    .text("Hospitalisations (blue)");

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(yB).ticks(5).tickFormat(d3.format(",")));
  svg
    .append("text")
    .attr("class", "chart-label")
    .attr("x", width - margin.right)
    .attr("y", 14)
    .attr("text-anchor", "end")
    .attr("fill", COLOR_AMBER)
    .text("Bed days (amber)");

  svg
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", COLOR_BLUE)
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => yH(d.hosp)),
    );

  svg
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", COLOR_AMBER)
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "6 4")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => yB(d.beds)),
    );

  const dotsH = svg
    .selectAll(".dotH")
    .data(rows)
    .join("circle")
    .attr("class", "dotH")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => yH(d.hosp))
    .attr("r", 4)
    .attr("fill", COLOR_BLUE)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(dotsH, (d) => `${d.year}: ${fmt(d.hosp)} hospitalisations`);

  const dotsB = svg
    .selectAll(".dotB")
    .data(rows)
    .join("circle")
    .attr("class", "dotB")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => yB(d.beds))
    .attr("r", 4)
    .attr("fill", COLOR_AMBER)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(dotsB, (d) => `${d.year}: ${fmt(d.beds)} bed days`);
}

function drawRemotenessChart(data) {
  const width = 640,
    height = 320;
  const margin = { top: 30, right: 60, bottom: 40, left: 120 };

  const rows = data
    .map((d) => ({
      name: d.Remoteness,
      value: num(d["Sum(Hospitalisations)"] || d.Hospitalisations),
    }))
    .filter((d) => d.name && d.name !== "Missing")
    .sort((a, b) => b.value - a.value);

  const svg = makeSvg("#chart-remoteness", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.value)])
    .nice()
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleBand()
    .domain(rows.map((d) => d.name))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(",")));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0));

  const bars = svg
    .selectAll(".bar")
    .data(rows)
    .join("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value) - x(0))
    .attr("height", y.bandwidth())
    .attr("fill", COLOR_BLUE);
  addTooltip(bars, (d) => `${d.name}: ${fmt(d.value)} injuries`);

  svg
    .selectAll(".val")
    .data(rows)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", (d) => x(d.value) + 6)
    .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
    .text((d) => fmt(d.value));
}

function drawAgeChart(data) {
  const width = 640,
    height = 340;
  const margin = { top: 30, right: 40, bottom: 40, left: 60 };

  const ageOrder = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];

  const rows = data
    .map((d) => ({
      age: d.Age_Group,
      value: num(d["Sum(Hospitalisations)"] || d.Hospitalisations),
    }))
    .filter((d) => ageOrder.includes(d.age));

  rows.sort((a, b) => ageOrder.indexOf(a.age) - ageOrder.indexOf(b.age));

  const svg = makeSvg("#chart-heatmap", width, height);
  if (!svg) return;

  const x = d3
    .scalePoint()
    .domain(rows.map((d) => d.age))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  svg
    .selectAll(".stick")
    .data(rows)
    .join("line")
    .attr("x1", (d) => x(d.age))
    .attr("y1", (d) => y(0))
    .attr("x2", (d) => x(d.age))
    .attr("y2", (d) => y(d.value))
    .attr("stroke", "#d3dae0")
    .attr("stroke-width", 2);

  const circles = svg
    .selectAll(".dot")
    .data(rows)
    .join("circle")
    .attr("cx", (d) => x(d.age))
    .attr("cy", (d) => y(d.value))
    .attr("r", 6)
    .attr("fill", COLOR_AMBER)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(circles, (d) => `Age ${d.age}: ${fmt(d.value)} injuries`);

  svg
    .selectAll(".val")
    .data(rows)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", (d) => x(d.age))
    .attr("y", (d) => y(d.value) - 12)
    .attr("text-anchor", "middle")
    .text((d) => fmt(d.value));
}

/* ==========================================================
   ROAD USERS PAGE — 6 Charts
   ========================================================== */

function drawStateTrend(data) {
  const width = 680,
    height = 360;
  const margin = { top: 40, right: 100, bottom: 40, left: 60 };

  const states = [...new Set(data.map((d) => d.state))].filter((s) => s);
  const years = [...new Set(data.map((d) => num(d.year)))].sort(
    (a, b) => a - b,
  );

  const series = states.map((state) => {
    const values = data
      .filter((d) => d.state === state)
      .map((d) => ({ year: num(d.year), value: num(d["Sum(count)"]) }))
      .sort((a, b) => a.year - b.year);
    return { name: state, values };
  });

  const svg = makeSvg("#chart-state-trend", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => num(d["Sum(count)"]))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  const color = d3.scaleOrdinal().domain(states).range(d3.schemeTableau10);

  series.forEach((s) => {
    svg
      .append("path")
      .datum(s.values)
      .attr("fill", "none")
      .attr("stroke", color(s.name))
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.year))
          .y((d) => y(d.value)),
      );

    const dots = svg
      .selectAll(null)
      .data(s.values)
      .join("circle")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", 3)
      .attr("fill", color(s.name));
    addTooltip(dots, (d) => `${s.name} (${d.year}): ${fmt(d.value)}`);
  });

  series.forEach((s, i) => {
    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - margin.right + 10}, ${margin.top + i * 22})`,
      );
    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(s.name));
    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 18)
      .attr("y", 11)
      .text(s.name);
  });
}

function drawRoadUserState(data) {
  const width = 680,
    height = 380;
  const margin = { top: 40, right: 60, bottom: 60, left: 60 };

  const row = data[0];
  const categories = Object.keys(row).filter(
    (k) => k !== "state" && k.includes("Sum(Sum(count))"),
  );

  const values = categories
    .map((cat) => ({
      name: cat.replace("+Sum(Sum(count))", ""),
      value: num(row[cat]),
    }))
    .sort((a, b) => b.value - a.value);

  const svg = makeSvg("#chart-roaduser-state", width, height);
  if (!svg) return;

  const x = d3
    .scaleBand()
    .domain(values.map((d) => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.3);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(values, (d) => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .tickFormat((d) => (d.length > 15 ? d.slice(0, 15) + "..." : d)),
    )
    .selectAll("text")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

  const bars = svg
    .selectAll(".bar")
    .data(values)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", COLOR_BLUE);
  addTooltip(bars, (d) => `${d.name}: ${fmt(d.value)}`);
}

function drawCounterparty(data) {
  const width = 500,
    height = 350;
  const margin = 20;

  const row = data[0];
  const categories = Object.keys(row).filter((k) => k !== "state");

  const values = categories
    .map((cat) => ({
      name: cat.replace("+Sum(count)", ""),
      value: num(row[cat]),
    }))
    .sort((a, b) => b.value - a.value);

  const svg = makeSvg("#chart-counterparty", width, height);
  if (!svg) return;

  const radius = Math.min(width, height) / 2 - margin;
  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2 - 60}, ${height / 2})`);

  const color = d3
    .scaleOrdinal()
    .domain(values.map((d) => d.name))
    .range(d3.schemeSet2);
  const pie = d3
    .pie()
    .value((d) => d.value)
    .sort(null);
  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);

  const arcs = g
    .selectAll(".arc")
    .data(pie(values))
    .join("g")
    .attr("class", "arc");
  const paths = arcs
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.name));
  addTooltip(
    paths,
    (d) =>
      `${d.data.name}: ${fmt(d.data.value)} (${d3.format(".1%")(d.data.value / d3.sum(values, (v) => v.value))})`,
  );

  values.forEach((v, i) => {
    const lg = g
      .append("g")
      .attr("transform", `translate(${radius + 20}, ${-radius + i * 22})`);
    lg.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(v.name));
    lg.append("text")
      .attr("class", "chart-label")
      .attr("x", 18)
      .attr("y", 11)
      .text(v.name);
  });
}

function drawSexState(data) {
  const width = 500,
    height = 300;
  const margin = { top: 30, right: 60, bottom: 40, left: 60 };
  const row = data[0];

  const females = num(row["Female+Sum(count)"]);
  const males = num(row["Male+Sum(count)"]);
  const total = females + males;

  const svg = makeSvg("#chart-sex-state", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain([0, total])
    .range([margin.left, width - margin.right]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(",")));

  const fBar = svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", height / 2 - 20)
    .attr("width", x(females) - x(0))
    .attr("height", 40)
    .attr("fill", COLOR_BLUE);
  addTooltip(
    fBar,
    () => `Female: ${fmt(females)} (${d3.format(".1%")(females / total)})`,
  );

  const mBar = svg
    .append("rect")
    .attr("x", x(females))
    .attr("y", height / 2 - 20)
    .attr("width", x(males) - x(0))
    .attr("height", 40)
    .attr("fill", COLOR_AMBER);
  addTooltip(
    mBar,
    () => `Male: ${fmt(males)} (${d3.format(".1%")(males / total)})`,
  );

  svg
    .append("text")
    .attr("class", "chart-label")
    .attr("x", x(females) / 2)
    .attr("y", height / 2 + 5)
    .attr("text-anchor", "middle")
    .text("Female")
    .attr("fill", "#fff");
  svg
    .append("text")
    .attr("class", "chart-label")
    .attr("x", x(females) + (x(males) - x(0)) / 2)
    .attr("y", height / 2 + 5)
    .attr("text-anchor", "middle")
    .text("Male")
    .attr("fill", "#fff");
}

function drawSmallMultiples(data) {
  const width = 680,
    height = 400;
  const margin = { top: 30, right: 20, bottom: 30, left: 40 };
  const states = Object.keys(data[0]).filter((k) => k !== "year");

  const svg = makeSvg("#chart-small-multiples", width, height);
  if (!svg) return;

  const cols = 2,
    rows = 4;
  const cellW = (width - margin.left - margin.right) / cols;
  const cellH = (height - margin.top - margin.bottom) / rows;

  const color = d3.scaleOrdinal().domain(states).range(d3.schemeTableau10);

  states.forEach((state, i) => {
    const cx = margin.left + (i % cols) * cellW;
    const cy = margin.top + Math.floor(i / cols) * cellH;

    const g = svg.append("g").attr("transform", `translate(${cx}, ${cy})`);
    const stateName = state.split("+")[0];
    const key = state;

    const values = data
      .map((d) => ({ year: num(d.year), value: num(d[key]) }))
      .sort((a, b) => a.year - b.year);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(values, (d) => d.year))
      .range([0, cellW - 20]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(values, (d) => d.value)])
      .range([cellH - 20, 0]);

    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 0)
      .attr("y", -5)
      .text(stateName)
      .style("font-weight", "bold");

    g.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", color(state))
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.year))
          .y((d) => y(d.value)),
      );

    const dots = g
      .selectAll(null)
      .data(values)
      .join("circle")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", 2)
      .attr("fill", color(state));
    addTooltip(dots, (d) => `${stateName} (${d.year}): ${fmt(d.value)}`);
  });
}

function drawAgeState(data) {
  const width = 680,
    height = 380;
  const margin = { top: 40, right: 60, bottom: 50, left: 60 };

  const row = data[0];
  const states = ["ACT", "NSW", "NT", "Qld", "SA", "Tas", "Vic", "WA"];

  const values = states
    .map((s) => ({
      state: s,
      value: num(row[`${s}+Sum(count)`]),
    }))
    .sort((a, b) => b.value - a.value);

  const svg = makeSvg("#chart-age-state", width, height);
  if (!svg) return;

  const x = d3
    .scaleBand()
    .domain(values.map((d) => d.state))
    .range([margin.left, width - margin.right])
    .padding(0.2);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(values, (d) => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")));

  const bars = svg
    .selectAll(".bar")
    .data(values)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.state))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", COLOR_AMBER);
  addTooltip(bars, (d) => `${d.state}: ${fmt(d.value)} injuries`);

  svg
    .selectAll(".val")
    .data(values)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", (d) => x(d.state) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 5)
    .attr("text-anchor", "middle")
    .text((d) => fmt(d.value));
}

/* ==========================================================
   WHO IS AFFECTED PAGE — 5 Charts
   ========================================================== */

function drawFNTrend(data) {
  const width = 680,
    height = 360;
  const margin = { top: 40, right: 100, bottom: 40, left: 60 };

  const rows = data
    .map((d) => ({
      year: num(d.year),
      fn: getHospColumn(d, "First Nations"),
      non: getHospColumn(d, "Non-Indigenous"),
    }))
    .sort((a, b) => a.year - b.year);

  const svg = makeSvg("#chart-fn-trend", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(rows, (d) => d.year))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => Math.max(d.fn, d.non))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(rows.length));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  svg
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", COLOR_BLUE)
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.non)),
    );

  const dotsNon = svg
    .selectAll(".dotNon")
    .data(rows)
    .join("circle")
    .attr("class", "dotNon")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.non))
    .attr("r", 4)
    .attr("fill", COLOR_BLUE)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(dotsNon, (d) => `${d.year} Non-Indigenous: ${fmt(d.non)}`);

  svg
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", COLOR_AMBER)
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.fn)),
    );

  const dotsFn = svg
    .selectAll(".dotFn")
    .data(rows)
    .join("circle")
    .attr("class", "dotFn")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.fn))
    .attr("r", 4)
    .attr("fill", COLOR_AMBER)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(dotsFn, (d) => `${d.year} First Nations: ${fmt(d.fn)}`);

  const legend = [
    { name: "Non-Indigenous", color: COLOR_BLUE },
    { name: "First Nations people", color: COLOR_AMBER },
  ];
  legend.forEach((l, i) => {
    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - margin.right + 10}, ${margin.top + i * 22})`,
      );
    g.append("rect").attr("width", 12).attr("height", 12).attr("fill", l.color);
    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 18)
      .attr("y", 11)
      .text(l.name);
  });
}

function drawFNAge(data) {
  const width = 680,
    height = 380;
  const margin = { top: 40, right: 24, bottom: 50, left: 70 };

  const rows = data.map((d) => ({
    age: d["Age group"],
    fn: getHospColumn(d, "First Nations"),
    non: getHospColumn(d, "Non-Indigenous"),
  }));

  const svg = makeSvg("#chart-fn-age", width, height);
  if (!svg) return;

  const x0 = d3
    .scaleBand()
    .domain(rows.map((d) => d.age))
    .range([margin.left, width - margin.right])
    .paddingInner(0.2);
  const x1 = d3
    .scaleBand()
    .domain(["fn", "non"])
    .range([0, x0.bandwidth()])
    .padding(0.08);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => Math.max(d.fn, d.non))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x0));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  const barsFn = svg
    .selectAll(".barFn")
    .data(rows)
    .join("rect")
    .attr("class", "barFn")
    .attr("x", (d) => x0(d.age) + x1("fn"))
    .attr("y", (d) => y(d.fn))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.fn))
    .attr("fill", COLOR_AMBER);
  addTooltip(barsFn, (d) => `Age ${d.age} First Nations: ${fmt(d.fn)}`);

  const barsNon = svg
    .selectAll(".barNon")
    .data(rows)
    .join("rect")
    .attr("class", "barNon")
    .attr("x", (d) => x0(d.age) + x1("non"))
    .attr("y", (d) => y(d.non))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.non))
    .attr("fill", COLOR_BLUE);
  addTooltip(barsNon, (d) => `Age ${d.age} Non-Indigenous: ${fmt(d.non)}`);

  const legend = [
    { name: "First Nations", color: COLOR_AMBER },
    { name: "Non-Indigenous", color: COLOR_BLUE },
  ];
  legend.forEach((l, i) => {
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left + i * 130},10)`);
    g.append("rect").attr("width", 14).attr("height", 14).attr("fill", l.color);
    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 20)
      .attr("y", 12)
      .text(l.name);
  });
}

function drawFNRoadUser(data) {
  const width = 680,
    height = 400;
  const margin = { top: 20, right: 40, bottom: 40, left: 200 };

  const users = [...new Set(data.map((d) => d["road user"]))];

  const sums = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => num(d["Sum(hospitalization)"])),
    (d) => d["road user"],
    (d) => d.states,
  );
  const rows = users
    .map((user) => {
      const fn = sums.get(user)?.get("First Nations people") || 0;
      const non = sums.get(user)?.get("Non-Indigenous") || 0;
      return { user, fn, non, total: fn + non };
    })
    .sort((a, b) => b.total - a.total);

  const svg = makeSvg("#chart-fn-roaduser", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.total)])
    .nice()
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleBand()
    .domain(rows.map((d) => d.user))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3
        .axisLeft(y)
        .tickSize(0)
        .tickFormat((d) => (d.length > 20 ? d.slice(0, 20) + "..." : d)),
    );

  const barsNon = svg
    .selectAll(".barNon")
    .data(rows)
    .join("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.user))
    .attr("width", (d) => x(d.non) - x(0))
    .attr("height", y.bandwidth())
    .attr("fill", COLOR_BLUE);
  addTooltip(barsNon, (d) => `${d.user} (Non-Indigenous): ${fmt(d.non)}`);

  const barsFn = svg
    .selectAll(".barFn")
    .data(rows)
    .join("rect")
    .attr("x", (d) => x(d.non))
    .attr("y", (d) => y(d.user))
    .attr("width", (d) => x(d.fn) - x(0))
    .attr("height", y.bandwidth())
    .attr("fill", COLOR_AMBER);
  addTooltip(barsFn, (d) => `${d.user} (First Nations): ${fmt(d.fn)}`);

  const legend = [
    { name: "Non-Indigenous", color: COLOR_BLUE },
    { name: "First Nations", color: COLOR_AMBER },
  ];
  legend.forEach((l, i) => {
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left + i * 130},10)`);
    g.append("rect").attr("width", 14).attr("height", 14).attr("fill", l.color);
    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 20)
      .attr("y", 12)
      .text(l.name);
  });
}

function drawFNRemoteness(data) {
  const width = 640,
    height = 360;
  const margin = { top: 40, right: 24, bottom: 50, left: 70 };

  const fnRow = data.find((d) => d.states === "First Nations people");
  const nonRow = data.find((d) => d.states === "Non-Indigenous");

  const locations = ["Major Cities", "Regional", "Remote"];
  const rows = locations.map((loc) => ({
    loc,
    fn: num(fnRow[`${loc}+Sum(hospitalization)`]),
    non: num(nonRow[`${loc}+Sum(hospitalization)`]),
  }));

  const svg = makeSvg("#chart-fn-remoteness", width, height);
  if (!svg) return;

  const x0 = d3
    .scaleBand()
    .domain(locations)
    .range([margin.left, width - margin.right])
    .paddingInner(0.2);
  const x1 = d3
    .scaleBand()
    .domain(["fn", "non"])
    .range([0, x0.bandwidth()])
    .padding(0.08);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => Math.max(d.fn, d.non))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x0));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));

  const barsFn = svg
    .selectAll(".barFn")
    .data(rows)
    .join("rect")
    .attr("class", "barFn")
    .attr("x", (d) => x0(d.loc) + x1("fn"))
    .attr("y", (d) => y(d.fn))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.fn))
    .attr("fill", COLOR_AMBER);
  addTooltip(barsFn, (d) => `${d.loc} First Nations: ${fmt(d.fn)}`);

  const barsNon = svg
    .selectAll(".barNon")
    .data(rows)
    .join("rect")
    .attr("class", "barNon")
    .attr("x", (d) => x0(d.loc) + x1("non"))
    .attr("y", (d) => y(d.non))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.non))
    .attr("fill", COLOR_BLUE);
  addTooltip(barsNon, (d) => `${d.loc} Non-Indigenous: ${fmt(d.non)}`);

  const legend = [
    { name: "First Nations", color: COLOR_AMBER },
    { name: "Non-Indigenous", color: COLOR_BLUE },
  ];
  legend.forEach((l, i) => {
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left + i * 130},10)`);
    g.append("rect").attr("width", 14).attr("height", 14).attr("fill", l.color);
    g.append("text")
      .attr("class", "chart-label")
      .attr("x", 20)
      .attr("y", 12)
      .text(l.name);
  });
}

function drawFNShare(data) {
  const width = 640,
    height = 320;
  const margin = { top: 30, right: 30, bottom: 40, left: 60 };

  const rows = data
    .map((d) => {
      const fn = getHospColumn(d, "First Nations");
      const non = getHospColumn(d, "Non-Indigenous");
      const total = fn + non;
      return {
        year: num(d.year),
        share: total > 0 ? (fn / total) * 100 : 0,
      };
    })
    .sort((a, b) => a.year - b.year);

  const svg = makeSvg("#chart-fn-share", width, height);
  if (!svg) return;

  const x = d3
    .scaleLinear()
    .domain(d3.extent(rows, (d) => d.year))
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (d) => d.share) * 1.2])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(rows.length));
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickFormat((d) => d + "%"),
    );

  const area = d3
    .area()
    .x((d) => x(d.year))
    .y0(y(0))
    .y1((d) => y(d.share));

  svg
    .append("path")
    .datum(rows)
    .attr("fill", COLOR_AMBER)
    .attr("opacity", 0.6)
    .attr("d", area);

  svg
    .append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", COLOR_AMBER)
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.share)),
    );

  const dots = svg
    .selectAll(".dot")
    .data(rows)
    .join("circle")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.share))
    .attr("r", 5)
    .attr("fill", COLOR_AMBER)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);
  addTooltip(dots, (d) => `${d.year}: ${d3.format(".1f")(d.share)}%`);
}

/* ==========================================================
   NAVIGATION & OVERVIEW STATS
   ========================================================== */

function setupRouter() {
  const views = document.querySelectorAll(".view");
  const links = document.querySelectorAll("nav a[data-view]");
  const baseTitle = document.title;

  function show() {
    let id = location.hash.slice(1);
    if (
      !document.getElementById(id) ||
      !document.getElementById(id).classList.contains("view")
    ) {
      id = "overview";
    }
    views.forEach((v) => v.classList.toggle("active", v.id === id));
    links.forEach((a) => {
      if (a.dataset.view === id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const view = document.getElementById(id);
    document.title = `${view.dataset.title} | ${baseTitle}`;
    window.scrollTo(0, 0);
    const heading = view.querySelector("h1, h2");
    if (heading) heading.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", show);
  show();
}

function fillStats(data) {
  const total = d3.sum(data, (d) => d.Hospitalisations);
  const sumWhere = (test) =>
    d3.sum(data.filter(test), (d) => d.Hospitalisations);
  const y2011 = sumWhere((d) => d.Year === 2011);
  const y2021 = sumWhere((d) => d.Year === 2021);
  const cyc = sumWhere(
    (d) => d.Road_User === "Motorcyclist" || d.Road_User === "Pedal cyclist",
  );
  const male = sumWhere((d) => d.Sex === "Male");
  const female = sumWhere((d) => d.Sex === "Female");
  const pct = d3.format(".0%");

  d3.select("#stat-total").text(fmt(total));
  d3.select("#stat-change").text("+" + pct(y2021 / y2011 - 1));
  d3.select("#stat-cyc").text(pct(cyc / total));
  d3.select("#stat-male").text(pct(male / (male + female)));
}
