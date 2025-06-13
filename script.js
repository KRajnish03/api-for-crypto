const searchInput = document.getElementById('searchInput');
const spinner = document.getElementById('spinner');
const cryptoList = document.getElementById('crypto-list');
const predictionSection = document.getElementById('prediction-section');
const recommendationText = document.getElementById('recommendation');
const reasonText = document.getElementById('reason');
const confidenceFill = document.getElementById('confidence-fill');
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '🌞' : '🌙';
});

async function fetchMarketData(coinId) {
  try {
    spinner.classList.remove('hidden');
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=10&page=1&sparkline=false`);
    const data = await response.json();

    if (data && Array.isArray(data) && data.length > 0) {
      displayCryptoData(data);
    } else {
      throw new Error('No data found');
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    cryptoList.innerHTML = `<p style="text-align:center;">Error loading coin data ❌</p>`;
  } finally {
    spinner.classList.add('hidden');
  }
}

function displayCryptoData(cryptos) {
  cryptoList.innerHTML = '';
  cryptos.forEach(coin => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `
      <img src="${coin.image}" alt="${coin.name}">
      <h3>${coin.name} (${coin.symbol.toUpperCase()})</h3>
      <p>Price: $${coin.current_price.toLocaleString()}</p>
      <p>Market Cap: $${coin.market_cap.toLocaleString()}</p>
      <p>24h Change: <span style="color: ${coin.price_change_percentage_24h > 0 ? 'green' : 'red'}">${coin.price_change_percentage_24h.toFixed(2)}%</span></p>
    `;
    cryptoList.appendChild(card);
  });
}

async function fetchHistoricalData(coinId) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30`);
    const data = await response.json();
    if (data && data.prices) return data.prices;
    else throw new Error('No historical data found');
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

function calculateSMA(prices, period = 14) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((acc, curr) => acc + curr[1], 0);
  return sum / period;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period - 1; i < prices.length - 1; i++) {
    const diff = prices[i + 1][1] - prices[i][1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

async function makePrediction(coinId) {
  const prices = await fetchHistoricalData(coinId);
  if (prices.length === 0) {
    recommendationText.innerText = "Unable to fetch data.";
    reasonText.innerText = "Please check the coin ID or try again.";
    predictionSection.classList.remove('hidden');
    return;
  }

  const sma = calculateSMA(prices);
  const rsi = calculateRSI(prices);
  let recommendation = '';
  let reason = '';
  let confidence = 50;

  if (rsi !== null && rsi < 30) {
    recommendation = 'Buy 🟢';
    reason = 'RSI indicates the coin is oversold.';
    confidence = 80;
  } else if (rsi !== null && rsi > 70) {
    recommendation = 'Sell 🔴';
    reason = 'RSI indicates the coin is overbought.';
    confidence = 80;
  } else if (sma !== null && prices[prices.length - 1][1] > sma) {
    recommendation = 'Buy 🟢';
    reason = 'Price is above the 14-day moving average.';
    confidence = 70;
  } else if (sma !== null && prices[prices.length - 1][1] < sma) {
    recommendation = 'Sell 🔴';
    reason = 'Price is below the 14-day moving average.';
    confidence = 70;
  } else {
    recommendation = 'Hold 🟡';
    reason = 'No clear trend detected.';
    confidence = 50;
  }

  recommendationText.innerText = recommendation;
  reasonText.innerText = reason;
  confidenceFill.style.width = `${confidence}%`;
  predictionSection.classList.remove('hidden');
}

let searchTimeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleSearch(e.target.value.trim().toLowerCase());
  }, 500);
});

async function handleSearch(query) {
  if (query.length < 3) return;

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
    const data = await response.json();

    if (!data || !data.coins || data.coins.length === 0) {
      cryptoList.innerHTML = `<p style="text-align:center;">No coins found matching "${query}" ❌</p>`;
      predictionSection.classList.add('hidden');
      return;
    }

    const matched = data.coins.find(c =>
      c.id === query || c.name.toLowerCase() === query || c.symbol.toLowerCase() === query
    ) || data.coins[0];

    const coinId = matched.id;
    await fetchMarketData(coinId);
    await makePrediction(coinId);

  } catch (err) {
    console.error('Search error:', err);
    cryptoList.innerHTML = `<p style="text-align:center;">Failed to search coin ❌</p>`;
    predictionSection.classList.add('hidden');
  }
}

fetchMarketData('bitcoin');
makePrediction('bitcoin');
