// Live Prices API-end point
const DOMAIN = "https://get-crypto-alert.herokuapp.com/api";

// timestamp to date time format
function getDateTime(timestamp, chartType) {
  switch (chartType) {
    case "live":
      return moment(timestamp).format("mm:ss");
    case "1h":
      return moment(timestamp).format("H:mm");
    case "1d":
      return moment(timestamp).format("H:mm");
    case "1y":
      return moment(timestamp).format("M[/]YY");

    default:
      return moment(timestamp).format("D[/]M");
  }
}

// Default values
let CURRENCY = "btc";
let Currencies24Hrs = [];

// Sorting Options
let sortByOptions = [
  { by: "-lastPrice", value: "₹ Price", arrow: "&#8593;" },
  { by: "lastPrice", value: "₹ Price", arrow: "&#8595;" },
  { by: "-change", value: "% Change", arrow: "&#8593;" },
  { by: "change", value: "% Change", arrow: "&#8595;" },
];

// Default sorting
let sortBy = sortByOptions[0];

let filterStarred = true;

let interval;

async function drawChartAgain(chartType, currency = CURRENCY) {
  let btnlive = document.getElementById("live");
  let btn1h = document.getElementById("1h");
  let btn1d = document.getElementById("1d");
  let btn1w = document.getElementById("1w");
  let btn1m = document.getElementById("1m");
  let btn1y = document.getElementById("1y");
  btnlive.classList = [`btn btn-sm chart-btn btn-primary`];
  btn1h.classList = [`btn btn-sm chart-btn btn-primary`];
  btn1d.classList = [`btn btn-sm chart-btn btn-primary`];
  btn1w.classList = [`btn btn-sm chart-btn btn-primary`];
  btn1m.classList = [`btn btn-sm chart-btn btn-primary`];
  btn1y.classList = [`btn btn-sm chart-btn btn-primary`];

  let btn = document.getElementById(chartType);
  btn.classList = [`${btn.className} prinary-btn-active`];

  var chart = document.getElementById("chart");
  chart.remove();

  var canvas = document.getElementById("canvas");
  canvas.innerHTML =
    '<canvas id="chart" class="chart" height="250" style="display: none" ></canvas>';

  let chartLoader = document.getElementById("chart-loader");
  chartLoader.style.display = "block";

  let chartStats = document.getElementById("chart-stats");
  chartStats.innerHTML = "";

  await drawChart(chartType, currency);
}

// Fetch data for chart from API
async function fetchChartData(currency, period, delta) {
  let url = new URL(`${DOMAIN}/apicalls/`);

  var date = new Date();
  let timestamp = date.getTime() - delta;
  timestamp = Math.floor(timestamp / 1000);

  url.search = new URLSearchParams({
    method: "GET",
    url: `https://x.wazirx.com/api/v2/k?market=${currency}inr&period=${period}&limit=2000&timestamp=${timestamp}`,
  }).toString();

  // making request
  let response = await fetch(url, {
    method: "GET",
  });

  // returning response
  return await response.json();
}

// Draw Chart
async function drawChart(chartType, currency = CURRENCY) {
  CURRENCY = currency;

  var period = "1";
  var delta = 900000;

  // Setting time delta(delta) and data gap(perior)
  switch (chartType) {
    case "1h":
      delta = 3600000;
      period = "1";
      break;
    case "1d":
      delta = 86400000;
      period = "60";
      break;
    case "1w":
      delta = 604800000;
      period = "120";
      break;
    case "1m":
      delta = 2628000000;
      period = "360";
      break;
    case "1y":
      delta = 31536000000;
      period = "1440";
      break;
    default:
      break;
  }

  // Prepare data for chart
  var data = await fetchChartData(currency, period, delta);

  // Prepare Labels for chart (date and time)
  let chartLabels = data.map((i) => getDateTime(i[0] * 1000, chartType));

  let chartData = data.map((i) => i[1]);

  // Chart from DOM
  var chart = document.getElementById("chart");
  var ctx = chart.getContext("2d");
  chart.style.display = "block";
  chart.style.maxHeight = "51vh";

  // Drawing Line Chart
  var chart = new Chart(ctx, {
    type: "line",
    data: {
      // Providing labels to chart
      labels: chartLabels,

      // Providing data and style to chart
      datasets: [
        {
          label: `${currency.toUpperCase()}/INR`,
          data: chartData,
          borderColor: "rgba(48, 103, 240, 1)",
          borderWidth: chartType === "1y" || chartType === "1m" ? 1 : 2,
          tension: 0.3,
        },
      ],
    },

    // Chart configurations
    options: {
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            stepSize: 1,
          },
        },
        y: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            display: false,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      elements: {
        point: {
          backgroundColor: "rgba(48, 103, 240, 1)",
          radius: [
            ...chartData.slice(0, chartData.length - 1).map((i) => i * 0),
            4,
          ],
        },
      },
    },
  });

  // Removing loader from DOM
  let chartLoader = document.getElementById("chart-loader");
  chartLoader.style.display = "none";

  let chartCard = document.getElementById("chart-card");
  chartCard.appendChild = ctx;

  // Checking for Star/Unstar
  let starWrapper = document.getElementById("star-wrapper");
  starWrapper.innerHTML = `<img
    class="star-icon"
    onclick="${
      isStarred(currency) ? "unstarCurrency" : "starCurrency"
    }('${currency}')"
    src="./assets/img/${isStarred(currency) ? "" : "not-"}star.png"
    alt="star"
  />`;

  // Drawing Header
  getChartStats(data);

  if (chartType !== "live") {
    clearInterval(interval);
    return;
  }

  // If Live, make continuous requests in every 30s
  interval = setInterval(async () => {
    var updatedData = await fetchChartData(currency, period, delta);

    var lastTS = data[data.length - 1][0];
    var latestFetchedTS = updatedData[updatedData.length - 1][0];
    var latestPrice = updatedData[updatedData.length - 1][1];

    if (latestFetchedTS !== lastTS) {
      data = updatedData;

      // Adding latest timestamp to list
      chart.data.labels.push(getDateTime(latestFetchedTS * 1000, chartType));
      // removing first timestamp on list
      chart.data.labels.shift();

      chart.data.datasets.forEach((dataset) => {
        // Adding latest price to list
        dataset.data.push(latestPrice);
        // removing first price on list
        dataset.data.shift();
      });

      // Shifting point to latest price
      chart.options.elements.point.radius = [
        ...chartData.slice(0, chartData.length - 1).map((i) => i * 0),
        4,
      ];

      // Removing animation
      chart.options.animation.duration = 0;

      // updating chart
      chart.update();
    }

    // Checking for updates on chart
    getChartStats(data);
  }, 15000);
}

// Last 24hrs market API request
async function fetch24hrMarket() {
  let url = new URL(`${DOMAIN}/apicalls/`);

  url.search = new URLSearchParams({
    method: "GET",
    url: "https://api.wazirx.com/uapi/v1/tickers/24hr",
  }).toString();

  let response = await fetch(url, {
    method: "GET",
  });

  data = await response.json();

  // prices only in "INR"
  Currencies24Hrs = data.filter((i) => i.quoteAsset === "inr");

  // append percent change to data array
  Currencies24Hrs = Currencies24Hrs.map((i) => ({
    ...i,
    change: parseFloat(
      (((i.lastPrice - i.openPrice) / i.openPrice) * 100).toFixed(2)
    ),
  }));

  Currencies24Hrs.sort(dynamicSort("-lastPrice"));

  return Currencies24Hrs;
}

// DOM manipulation
async function Market24hrs(data = Currencies24Hrs, search = false) {
  if (!search) {
    // fetching data
    data = await fetch24hrMarket();
  }

  let html = "";

  // Preparing DOM Element(List of currencies)
  data.forEach((i) => {
    let percent = parseFloat(
      (((i.lastPrice - i.openPrice) / i.openPrice) * 100).toFixed(2)
    );
    let up = percent >= 0;

    html += `
      <li class="list-group-item" onclick="drawChartAgain('live', '${
        i.baseAsset
      }'); window.location.replace('#c'); clearInterval(interval);">
        <div class="row">
          <div class="col-2">
            <img
              class="coin-logo"
              src="https://media.wazirx.com/media/${i.baseAsset}/84.png"
              alt="${i.baseAsset}"
            />
          </div>
          <div class="col-10">
            <div class="row">
              <div class="col">
                <p class="m-0 strong bold">
                ${i.baseAsset.toUpperCase()}
                ${
                  isStarred(`${i.baseAsset}`)
                    ? `
                    <img
                      class="small-star-icon"
                      src="./assets/img/star.png"
                      alt="star"
                    />
                    `
                    : ""
                }
                </p>
              </div>
              <div class="col">
                <p class="m-0 text-end strong bold">₹ ${numeral(
                  i.lastPrice
                ).format("0,0.[0000000000]")} &nbsp;</p>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <p class="m-0">${i.baseAsset.toUpperCase()}</p>
              </div>
              <div class="col">
                <p class="m-0 text-end ${up ? "green" : "red"} small bold">
                  ${up ? "+" : ""}${percent}% &nbsp;
                </p>
              </div>
            </div>
          </div>
        </div>
      </li>`;
  });

  const market24hrs = document.getElementById("market24hrs");
  market24hrs.innerHTML = html;

  const currenciesHeading = document.getElementById("currencies-heading");
  currenciesHeading.innerHTML = `Currencies (${data.length})`;
}

// Chart Header Data
function getChartStats(data) {
  // highest in given time
  var highest = data[0][1];

  // lowest in given time
  var lowest = data[0][1];

  // Current price
  var current = data[data.length - 1][1];

  data.forEach((i) => {
    let x = parseFloat(i[1]);
    if (x > highest) {
      highest = x;
    }
    if (x < lowest) {
      lowest = x;
    }
  });

  // Starting price
  var open = data[0][1];

  // Latest price
  var close = data[data.length - 1][1];

  // Calculating change percentage
  let percent = parseFloat((((close - open) / open) * 100).toFixed(2));

  // Checking if value increased or decreased
  let up = percent >= 0;

  // Peparing DOM element
  let chartStats = document.getElementById("chart-stats");
  chartStats.innerHTML = `
    <div
      class="row mb-3"
      style="
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding-left: 7px;
        padding-right: 7px;
      "
    >
    <div class="col-6 d-flex justify-content-center bold">₹ ${numeral(
      current
    ).format("0,0.[0000000]")}</div>

    <div class="col-6 d-flex justify-content-center bold ${
      up ? "green" : "red"
    }">${up ? "+" : ""}${percent}% &nbsp;</div>
    </div>
    <div
      class="row mb-3"
      style="
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding-left: 7px;
        padding-right: 7px;
      "
    >
    <div class="col-6 d-flex justify-content-center xs-small">Highest &nbsp; <b>₹${numeral(
      highest
    ).format("0,0.[0000000]")}</b></div>
    <div class="col-6 d-flex justify-content-center xs-small">Lowest &nbsp; <b>₹${numeral(
      lowest
    ).format("0,0.[0000000]")}</b></div>
    </div>`;
}

// Searching
var searchInput = document.getElementById("search-input");
searchInput.addEventListener("keypress", function (e) {
  value = searchInput.value;
  if (e.key !== "Enter") {
    value += e.key;
  }
  data = Currencies24Hrs.filter((i) => i.baseAsset.match(value));
  Market24hrs(data, true);
});
searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Backspace") {
    value = searchInput.value;
    value = value.slice(0, value.length - 1);
    data = Currencies24Hrs.filter((i) => i.baseAsset.match(value));
    Market24hrs(data, true);
  }
});

// Starring a currency
function starCurrency(currency) {
  let store = window.localStorage.getItem("starred");
  if (store) {
    store = JSON.parse(store);
  } else {
    store = [];
  }
  store = [...store, currency];

  localStorage.setItem("starred", JSON.stringify(store));

  let starWrapper = document.getElementById("star-wrapper");
  starWrapper.innerHTML = `<img
    class="star-icon"
    onclick="unstarCurrency('${currency}')"
    src="./assets/img/star.png"
    alt="star"
  />`;
}

// Unstarring a currency
function unstarCurrency(currency) {
  let store = window.localStorage.getItem("starred");
  if (store) {
    store = JSON.parse(store);
  } else {
    store = [];
  }
  store = store.filter((i) => i !== currency);

  localStorage.setItem("starred", JSON.stringify(store));

  let starWrapper = document.getElementById("star-wrapper");
  starWrapper.innerHTML = `<img
    class="star-icon"
    onclick="starCurrency('${currency}')"
    src="./assets/img/not-star.png"
    alt="star"
  />`;
}

// Checking if currency is starred or not
function isStarred(currency) {
  let store = window.localStorage.getItem("starred");
  if (store) {
    store = JSON.parse(store);
    if (store.indexOf(currency) === -1) {
      return false;
    }
    return true;
  }
  return false;
}

// Sorting
async function switchSort() {
  var currentIndex = sortByOptions.indexOf(sortBy);
  if (currentIndex === sortByOptions.length - 1) {
    sortBy = sortByOptions[0];
  } else {
    sortBy = sortByOptions[currentIndex + 1];
  }

  var sortByElement = document.getElementById("sort-by");
  sortByElement.innerHTML = `${sortBy.value} ${sortBy.arrow}`;

  Currencies24Hrs.sort(dynamicSort(`${sortBy.by}`));

  await Market24hrs(Currencies24Hrs, true);
}

// Sort by property
function dynamicSort(property) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    let val_a = parseFloat(a[property]);
    let val_b = parseFloat(b[property]);

    var result = val_a < val_b ? -1 : val_a > val_b ? 1 : 0;
    return result * sortOrder;
  };
}

// Filter by star
function toggleFilterStarred() {
  var filterStarredElement = document.getElementById("filter-starred");
  filterStarredElement.innerHTML = `
    <img
      class="small-star-icon"
      src="./assets/img/${filterStarred ? "" : "not-"}star.png"
      alt="star"
    />
      &nbsp;Starred
    </span>
  `;
  var starredCurrencies = null;
  if (filterStarred) {
    var starredCurrencies = Currencies24Hrs.filter((i) =>
      isStarred(i.baseAsset)
    );
  }
  Market24hrs(starredCurrencies ? starredCurrencies : Currencies24Hrs, true);
  filterStarred = !filterStarred;
}

var sortByElement = document.getElementById("sort-by");
sortByElement.innerHTML = `₹ Price &#8595;`;
