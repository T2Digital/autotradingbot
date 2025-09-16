/* ==================================================================
   بوت الفلاش لون المتطور - ملف JavaScript الكامل مع جميع المميزات
   ================================================================== */

// Global Variables
let provider, signer, contract;
let isConnected = false;
let isContractConnected = false;
let currentTab = 'connection';
let tradingInterval;
let portfolioChart;
let performanceChart;

// دالة للتحقق من حالة MetaMask
function checkMetaMaskStatus() {
    console.log('🔍 Checking MetaMask status...');
    
    // تحقق من وجود window.ethereum
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ window.ethereum found');
        console.log('MetaMask detected:', window.ethereum.isMetaMask);
        console.log('Selected address:', window.ethereum.selectedAddress);
        console.log('Network version:', window.ethereum.networkVersion);
        
        // تحقق من حالة الاتصال
        if (window.ethereum.selectedAddress) {
            console.log('✅ User already connected to:', window.ethereum.selectedAddress);
        } else {
            console.log('⚠️ User not connected');
        }
        
        return true;
    } else {
        console.log('❌ window.ethereum not found');
        return false;
    }
}

// Contract Configuration
const CONTRACT_ABI = [
    // Owner and Admin Functions
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function emergencyPause() external",
    "function unpause() external",
    
    // Statistics Functions
    "function getStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function getBalances() view returns (uint256, uint256, uint256, uint256, uint256)",
    "function getTotalProfit() view returns (uint256)",
    "function getDailyProfit() view returns (uint256)",
    "function getTradeHistory(uint256 limit, uint256 offset) view returns (tuple(uint256,address,uint256,uint256,bool,uint256)[])",
    
    // Trading Functions
    "function checkOpportunities() view returns (address[], uint256[])",
    "function executeArbitrage(address token, uint256 amount, bytes calldata data) external",
    "function setMinProfitThreshold(uint256 threshold) external",
    "function setMaxSlippage(uint256 slippage) external",
    "function setMaxTradeAmount(uint256 amount) external",
    "function setTradingEnabled(bool enabled) external",
    
    // Fund Management
    "function depositToken(address token, uint256 amount) external",
    "function withdrawToken(address token, uint256 amount) external",
    "function withdrawAll() external",
    
    // Settings
    "function getSettings() view returns (uint256, uint256, uint256, bool)",
    "function updateSettings(uint256 minProfit, uint256 maxSlippage, uint256 maxAmount) external"
];

// Token Addresses (Polygon Mainnet)
const TOKEN_ADDRESSES = {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
};

// Application State
const AppState = {
    wallet: {
        connected: false,
        address: '',
        balance: '0',
        network: ''
    },
    contract: {
        connected: false,
        address: '',
        owner: '',
        paused: false
    },
    trading: {
        enabled: false,
        autoTrading: false,
        stats: {},
        settings: {},
        opportunities: []
    },
    ui: {
        currentTab: 'connection',
        loading: false
    }
};

// DOM Elements Cache
const Elements = {
    // Connection
    connectWalletBtn: null,
    connectContractBtn: null,
    walletInfo: null,
    contractInfo: null,
    
    // Status
    statusBar: null,
    statusText: null,
    
    // Trading
    autoTradingToggle: null,
    startTradingBtn: null,
    stopTradingBtn: null,
    emergencyStopBtn: null,
    
    // Stats
    totalTrades: null,
    successfulTrades: null,
    successRate: null,
    dailyProfit: null,
    
    // Tables
    recentTrades: null,
    historyTable: null,
    
    init() {
        this.connectWalletBtn = document.getElementById('connectWallet');
        this.connectContractBtn = document.getElementById('connectContract');
        this.walletInfo = document.getElementById('walletInfo');
        this.contractInfo = document.getElementById('contractInfo');
        this.statusBar = document.getElementById('statusBar');
        this.statusText = document.getElementById('statusText');
        this.autoTradingToggle = document.getElementById('autoTradingToggle');
        this.startTradingBtn = document.getElementById('startTrading');
        this.stopTradingBtn = document.getElementById('stopTrading');
        this.emergencyStopBtn = document.getElementById('emergencyStop');
        this.totalTrades = document.getElementById('totalTrades');
        this.successfulTrades = document.getElementById('successfulTrades');
        this.successRate = document.getElementById('successRate');
        this.dailyProfit = document.getElementById('dailyProfit');
        this.recentTrades = document.getElementById('recentTrades');
        this.historyTable = document.getElementById('historyTable');
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Flash Loan Bot Advanced Interface Starting...');
    
    // Initialize DOM elements cache
    Elements.init();
    
function checkLibraries() {
    try {
        const errors = [];
        
        // تحقق من Ethers.js
        if (typeof ethers === 'undefined') {
            errors.push('Ethers.js library not loaded');
        } else {
            console.log('✅ Ethers.js loaded successfully');
            console.log('Ethers version:', ethers.version || 'Unknown');
        }
        
        // تحقق من MetaMask
        const metamaskStatus = checkMetaMaskStatus();
        if (!metamaskStatus) {
            console.warn('⚠️ MetaMask not detected');
        }
        
        // تحقق من Feather Icons
        if (typeof feather === 'undefined') {
            console.warn('⚠️ Feather Icons not loaded, using fallback');
        } else {
            console.log('✅ Feather Icons loaded successfully');
        }
        
        // تحقق من Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js not loaded, charts will be disabled');
        } else {
            console.log('✅ Chart.js loaded successfully');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
        
        updateStatus('✅ تم تحميل جميع المكتبات بنجاح', 'success');
        
    } catch (error) {
        updateStatus('❌ خطأ في تحميل المكتبات: ' + error.message, 'error');
        console.error('Library loading error:', error);
    }
}


// Icons Initialization
function initializeIcons() {
    try {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    } catch (error) {
        console.warn('Icon initialization failed:', error);
    }
}

// Tab System
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName) {
            content.classList.add('active');
        }
    });
    
    AppState.ui.currentTab = tabName;
    
    // Load tab-specific data
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'dashboard':
            refreshStats();
            refreshRecentTrades();
            break;
        case 'portfolio':
            refreshBalances();
            updatePortfolioChart();
            break;
        case 'history':
            loadTradeHistory();
            break;
        case 'analytics':
            updatePerformanceChart();
            updateAnalytics();
            break;
    }
}

// Event Listeners
function initializeEventListeners() {
    // Wallet Connection
    if (Elements.connectWalletBtn) {
        Elements.connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    if (Elements.connectContractBtn) {
        Elements.connectContractBtn.addEventListener('click', connectContract);
    }
    
    // Trading Controls
    if (Elements.autoTradingToggle) {
        Elements.autoTradingToggle.addEventListener('change', toggleAutoTrading);
    }
    
    if (Elements.startTradingBtn) {
        Elements.startTradingBtn.addEventListener('click', startTrading);
    }
    
    if (Elements.stopTradingBtn) {
        Elements.stopTradingBtn.addEventListener('click', stopTrading);
    }
    
    if (Elements.emergencyStopBtn) {
        Elements.emergencyStopBtn.addEventListener('click', emergencyStop);
    }
    
    // Opportunities
    const scanOpportunitiesBtn = document.getElementById('scanOpportunities');
    if (scanOpportunitiesBtn) {
        scanOpportunitiesBtn.addEventListener('click', scanOpportunities);
    }
    
    // Portfolio Management
    const depositBtn = document.getElementById('depositFunds');
    const withdrawBtn = document.getElementById('withdrawFunds');
    const refreshBalancesBtn = document.getElementById('refreshBalances');
    
    if (depositBtn) depositBtn.addEventListener('click', depositFunds);
    if (withdrawBtn) withdrawBtn.addEventListener('click', withdrawFunds);
    if (refreshBalancesBtn) refreshBalancesBtn.addEventListener('click', refreshBalances);
    
    // Settings
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // History filters
    const filterPeriod = document.getElementById('filterPeriod');
    const filterType = document.getElementById('filterType');
    const exportHistoryBtn = document.getElementById('exportHistory');
    
    if (filterPeriod) filterPeriod.addEventListener('change', loadTradeHistory);
    if (filterType) filterType.addEventListener('change', loadTradeHistory);
    if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', exportHistory);
    
    // Refresh buttons
    const refreshTradesBtn = document.getElementById('refreshTrades');
    if (refreshTradesBtn) {
        refreshTradesBtn.addEventListener('click', refreshRecentTrades);
    }
    
    // MetaMask event listeners
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
    }
}
async function connectWallet() {
    try {
        showLoading('جاري الاتصال بالمحفظة...');
        updateStatus('⏳ جاري الاتصال بالمحفظة...', 'info');

        if (!window.ethereum) {
            throw new Error('MetaMask غير مثبت. يرجى تثبيت MetaMask أولاً من https://metamask.io');
        }

        // إنشاء Web3Provider
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

        // طلب حسابات
        await provider.send('eth_requestAccounts', []);

        // الحصول على Signer
        signer = provider.getSigner();

        // جلب بيانات المحفظة
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address).then(b => ethers.formatEther(b));
        const network = await provider.getNetwork();

        AppState.wallet = {
            connected: true,
            address,
            balance,
            network: network.name
        };

        updateWalletUI();
        updateNetworkStatus(network.name, true);

        isConnected = true;
        updateStatus('✅ تم ربط المحفظة بنجاح', 'success');
        showNotification('تم ربط المحفظة بنجاح', 'success');

    } catch (error) {
        console.error('Wallet connection error:', error);
        const msg = error.message.includes('User rejected') ?
            'تم رفض طلب الاتصال من المستخدم' :
            'فشل في الاتصال بالمحفظة: ' + error.message;
        updateStatus('❌ ' + msg, 'error');
        showNotification(msg, 'error');
    } finally {
        hideLoading();
    }
}


// Contract Connection
async function connectContract() {
    try {
        if (!isConnected) {
            throw new Error('يجب ربط المحفظة أولاً');
        }
        
        const contractAddress = document.getElementById('contractAddress').value.trim();
        if (!contractAddress) {
            throw new Error('يرجى إدخال عنوان العقد');
        }
        
        if (!ethers.isAddress(contractAddress)) {
            throw new Error('عنوان العقد غير صحيح');
        }
        
        showLoading('جاري الاتصال بالعقد...');
        updateStatus('⏳ جاري الاتصال بالعقد...', 'info');
        
        // Create contract instance
        contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
        
        // Test connection
        const owner = await contract.owner();
        const isPaused = await contract.paused();
        
        // Update state
        AppState.contract = {
            connected: true,
            address: contractAddress,
            owner: owner,
            paused: isPaused
        };
        
        // Update UI
        updateContractUI();
        
        isContractConnected = true;
        updateStatus('✅ تم ربط العقد بنجاح', 'success');
        showNotification('تم ربط العقد بنجاح', 'success');
        
        // Enable other tabs
        enableTabs();
        
        // Load initial data
        await loadContractData();
        
    } catch (error) {
        console.error('Contract connection error:', error);
        updateStatus('❌ خطأ في ربط العقد: ' + error.message, 'error');
        showNotification('فشل في ربط العقد: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Update Wallet UI
function updateWalletUI() {
    if (Elements.walletInfo) {
        Elements.walletInfo.style.display = 'block';
        
        const addressElement = document.getElementById('walletAddress');
        const balanceElement = document.getElementById('maticBalance');
        const networkElement = document.getElementById('networkInfo');
        
        if (addressElement) {
            addressElement.textContent = formatAddress(AppState.wallet.address);
            addressElement.title = AppState.wallet.address;
        }
        
        if (balanceElement) {
            balanceElement.textContent = parseFloat(AppState.wallet.balance).toFixed(4) + ' MATIC';
        }
        
        if (networkElement) {
            networkElement.textContent = getNetworkDisplayName(AppState.wallet.network);
        }
    }
    
    if (Elements.connectWalletBtn) {
        Elements.connectWalletBtn.innerHTML = '<i data-feather="check"></i> متصل بنجاح';
        Elements.connectWalletBtn.disabled = true;
        Elements.connectWalletBtn.classList.add('btn-success');
    }
    
    // Show contract section
    const contractSection = document.getElementById('contractSection');
    if (contractSection) {
        contractSection.style.display = 'block';
    }
    
    // Update security status
    const walletSecurityStatus = document.getElementById('walletSecurityStatus');
    if (walletSecurityStatus) {
        walletSecurityStatus.textContent = 'متصل';
        walletSecurityStatus.className = 'status-badge success';
    }
    
    initializeIcons();
}

// Update Contract UI
function updateContractUI() {
    if (Elements.contractInfo) {
        Elements.contractInfo.style.display = 'block';
        
        const ownerElement = document.getElementById('contractOwner');
        const statusElement = document.getElementById('botStatus');
        
        if (ownerElement) {
            ownerElement.textContent = formatAddress(AppState.contract.owner);
            ownerElement.title = AppState.contract.owner;
        }
        
        if (statusElement) {
            statusElement.textContent = AppState.contract.paused ? '🔴 متوقف' : '🟢 يعمل';
            statusElement.className = AppState.contract.paused ? 'value danger' : 'value success';
        }
    }
    
    if (Elements.connectContractBtn) {
        Elements.connectContractBtn.innerHTML = '<i data-feather="check"></i> متصل';
        Elements.connectContractBtn.disabled = true;
        Elements.connectContractBtn.classList.add('btn-success');
    }
    
    // Update security status
    const contractSecurityStatus = document.getElementById('contractSecurityStatus');
    if (contractSecurityStatus) {
        contractSecurityStatus.textContent = 'متصل';
        contractSecurityStatus.className = 'status-badge success';
    }
    
    initializeIcons();
}

// Network Status Update
function updateNetworkStatus(networkName, connected) {
    const networkNameElement = document.getElementById('networkName');
    const statusDot = document.getElementById('statusDot');
    
    if (networkNameElement) {
        networkNameElement.textContent = connected ? getNetworkDisplayName(networkName) : 'غير متصل';
    }
    
    if (statusDot) {
        statusDot.className = connected ? 'status-dot connected' : 'status-dot';
    }
}

// Enable Tabs
function enableTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.style.opacity = '1';
        tab.style.pointerEvents = 'auto';
    });
}

// Load Contract Data
async function loadContractData() {
    try {
        await Promise.all([
            loadStats(),
            loadSettings(),
            loadBalances()
        ]);
    } catch (error) {
        console.error('Error loading contract data:', error);
    }
}

// Statistics
async function loadStats() {
    try {
        if (!contract) return;
        
        const stats = await contract.getStats();
        const totalProfit = await contract.getTotalProfit();
        const dailyProfit = await contract.getDailyProfit();
        
        AppState.trading.stats = {
            totalTrades: stats[0].toString(),
            successfulTrades: stats[1].toString(),
            failedTrades: stats[2].toString(),
            successRate: stats[3].toString(),
            totalVolume: ethers.formatUnits(stats[4], 6),
            avgProfit: ethers.formatUnits(stats[5], 6),
            maxProfit: ethers.formatUnits(stats[6], 6),
            totalProfit: ethers.formatUnits(totalProfit, 6),
            dailyProfit: ethers.formatUnits(dailyProfit, 6)
        };
        
        updateStatsUI();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsUI() {
    const stats = AppState.trading.stats;
    
    if (Elements.totalTrades) {
        Elements.totalTrades.textContent = stats.totalTrades || '0';
    }
    
    if (Elements.successfulTrades) {
        Elements.successfulTrades.textContent = stats.successfulTrades || '0';
    }
    
    if (Elements.successRate) {
        Elements.successRate.textContent = stats.successRate + '%' || '0%';
    }
    
    if (Elements.dailyProfit) {
        Elements.dailyProfit.textContent = '$' + (stats.dailyProfit || '0.00');
    }
    
    // Update total profit display
    const totalProfitElement = document.getElementById('totalProfit');
    if (totalProfitElement) {
        totalProfitElement.textContent = '$' + (stats.totalProfit || '0.00');
    }
    
    // Update analytics KPIs
    const totalReturnElement = document.getElementById('totalReturn');
    const monthlyReturnElement = document.getElementById('monthlyReturn');
    const avgProfitElement = document.getElementById('avgProfit');
    const maxProfitElement = document.getElementById('maxProfit');
    
    if (totalReturnElement) {
        const totalReturn = parseFloat(stats.totalProfit || 0);
        totalReturnElement.textContent = totalReturn > 0 ? `+${totalReturn.toFixed(2)}%` : `${totalReturn.toFixed(2)}%`;
        totalReturnElement.className = totalReturn > 0 ? 'kpi-value' : 'kpi-value negative';
    }
    
    if (avgProfitElement) {
        avgProfitElement.textContent = '$' + (stats.avgProfit || '0.00');
    }
    
    if (maxProfitElement) {
        maxProfitElement.textContent = '$' + (stats.maxProfit || '0.00');
    }
}

// Settings Management
async function loadSettings() {
    try {
        if (!contract) return;
        
        const settings = await contract.getSettings();
        
        AppState.trading.settings = {
            minProfitThreshold: ethers.formatUnits(settings[0], 6),
            maxSlippage: settings[1].toString(),
            maxTradeAmount: ethers.formatUnits(settings[2], 6),
            tradingEnabled: settings[3]
        };
        
        updateSettingsUI();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        // Use default settings
        AppState.trading.settings = {
            minProfitThreshold: '1.0',
            maxSlippage: '2',
            maxTradeAmount: '1000',
            tradingEnabled: false
        };
        updateSettingsUI();
    }
}

function updateSettingsUI() {
    const settings = AppState.trading.settings;
    
    const minProfitInput = document.getElementById('minProfitThreshold');
    const maxSlippageInput = document.getElementById('maxSlippage');
    const maxTradeAmountInput = document.getElementById('maxTradeAmount');
    
    if (minProfitInput) {
        minProfitInput.value = settings.minProfitThreshold;
    }
    
    if (maxSlippageInput) {
        maxSlippageInput.value = settings.maxSlippage;
    }
    
    if (maxTradeAmountInput) {
        maxTradeAmountInput.value = settings.maxTradeAmount;
    }
    
    // Update trading status
    if (Elements.autoTradingToggle) {
        Elements.autoTradingToggle.checked = settings.tradingEnabled;
    }
    
    AppState.trading.enabled = settings.tradingEnabled;
}

async function saveSettings() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        const minProfit = document.getElementById('minProfitThreshold').value;
        const maxSlippage = document.getElementById('maxSlippage').value;
        const maxAmount = document.getElementById('maxTradeAmount').value;
        const maxDailyLoss = document.getElementById('maxDailyLoss').value;
        const tradingInterval = document.getElementById('tradingInterval').value;
        
        // Validate inputs
        if (!minProfit || !maxSlippage || !maxAmount) {
            throw new Error('يرجى ملء جميع الحقول');
        }
        
        showLoading('جاري حفظ الإعدادات...');
        
        // Convert to contract format
        const minProfitWei = ethers.parseUnits(minProfit, 6);
        const maxSlippageBPS = parseInt(maxSlippage) * 100; // Convert to basis points
        const maxAmountWei = ethers.parseUnits(maxAmount, 6);
        
        const tx = await contract.updateSettings(minProfitWei, maxSlippageBPS, maxAmountWei);
        updateStatus('⏳ انتظار تأكيد المعاملة...', 'info');
        
        await tx.wait();
        
        // Save additional settings locally
        const additionalSettings = {
            maxDailyLoss,
            tradingInterval
        };
        localStorage.setItem('botSettings', JSON.stringify(additionalSettings));
        
        updateStatus('✅ تم حفظ الإعدادات بنجاح', 'success');
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
        
        // Reload settings
        await loadSettings();
        
    } catch (error) {
        console.error('Save settings error:', error);
        updateStatus('❌ خطأ في حفظ الإعدادات: ' + error.message, 'error');
        showNotification('فشل في حفظ الإعدادات: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Load saved settings from localStorage
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('botSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            const maxDailyLossInput = document.getElementById('maxDailyLoss');
            const tradingIntervalInput = document.getElementById('tradingInterval');
            
            if (maxDailyLossInput && settings.maxDailyLoss) {
                maxDailyLossInput.value = settings.maxDailyLoss;
            }
            
            if (tradingIntervalInput && settings.tradingInterval) {
                tradingIntervalInput.value = settings.tradingInterval;
            }
        }
    } catch (error) {
        console.error('Error loading saved settings:', error);
    }
}

// Trading Controls
async function toggleAutoTrading() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        const enabled = Elements.autoTradingToggle.checked;
        
        showLoading(enabled ? 'تفعيل التداول التلقائي...' : 'إيقاف التداول التلقائي...');
        
        const tx = await contract.setTradingEnabled(enabled);
        await tx.wait();
        
        AppState.trading.autoTrading = enabled;
        
        if (enabled) {
            startTradingLoop();
            updateStatus('✅ تم تفعيل التداول التلقائي', 'success');
            showNotification('تم تفعيل التداول التلقائي', 'success');
        } else {
            stopTradingLoop();
            updateStatus('⏸️ تم إيقاف التداول التلقائي', 'warning');
            showNotification('تم إيقاف التداول التلقائي', 'warning');
        }
        
    } catch (error) {
        console.error('Toggle auto trading error:', error);
        // Revert checkbox state
        Elements.autoTradingToggle.checked = !Elements.autoTradingToggle.checked;
        updateStatus('❌ خطأ في تغيير حالة التداول: ' + error.message, 'error');
        showNotification('فشل في تغيير حالة التداول', 'error');
    } finally {
        hideLoading();
    }
}

function startTradingLoop() {
    if (tradingInterval) {
        clearInterval(tradingInterval);
    }
    
    const intervalSeconds = parseInt(document.getElementById('tradingInterval')?.value || '300');
    
    tradingInterval = setInterval(async () => {
        try {
            await scanAndExecuteOpportunities();
        } catch (error) {
            console.error('Trading loop error:', error);
        }
    }, intervalSeconds * 1000);
}

function stopTradingLoop() {
    if (tradingInterval) {
        clearInterval(tradingInterval);
        tradingInterval = null;
    }
}

async function startTrading() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ بدء التداول...', 'info');
        
        // Enable trading if not already enabled
        if (!AppState.trading.enabled) {
            const tx = await contract.setTradingEnabled(true);
            await tx.wait();
        }
        
        AppState.trading.enabled = true;
        
        updateStatus('✅ تم بدء التداول', 'success');
        showNotification('تم بدء التداول', 'success');
        
        // Update button states
        Elements.startTradingBtn.disabled = true;
        Elements.stopTradingBtn.disabled = false;
        
    } catch (error) {
        console.error('Start trading error:', error);
        updateStatus('❌ خطأ في بدء التداول: ' + error.message, 'error');
    }
}

async function stopTrading() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ إيقاف التداول...', 'info');
        
        const tx = await contract.setTradingEnabled(false);
        await tx.wait();
        
        AppState.trading.enabled = false;
        stopTradingLoop();
        
        updateStatus('⏸️ تم إيقاف التداول', 'warning');
        showNotification('تم إيقاف التداول', 'warning');
        
        // Update button states
        Elements.startTradingBtn.disabled = false;
        Elements.stopTradingBtn.disabled = true;
        
    } catch (error) {
        console.error('Stop trading error:', error);
        updateStatus('❌ خطأ في إيقاف التداول: ' + error.message, 'error');
    }
}

async function emergencyStop() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        const confirmed = confirm('⚠️ هل أنت متأكد من إيقاف البوت في حالة طوارئ؟ هذا سيوقف جميع العمليات فوراً.');
        
        if (!confirmed) return;
        
        showLoading('إيقاف طوارئ...');
        updateStatus('🚨 إيقاف طوارئ...', 'error');
        
        const tx = await contract.emergencyPause();
        await tx.wait();
        
        AppState.trading.enabled = false;
        AppState.contract.paused = true;
        stopTradingLoop();
        
        updateStatus('🛑 تم إيقاف البوت في حالة طوارئ', 'error');
        showNotification('تم إيقاف البوت في حالة طوارئ', 'error');
        
        // Disable all trading controls
        Elements.startTradingBtn.disabled = true;
        Elements.stopTradingBtn.disabled = true;
        Elements.autoTradingToggle.disabled = true;
        
        // Update contract info
        updateContractUI();
        
    } catch (error) {
        console.error('Emergency stop error:', error);
        updateStatus('❌ خطأ في إيقاف الطوارئ: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Opportunities
async function scanOpportunities() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ جاري فحص الفرص...', 'info');
        showLoading('فحص الفرص المتاحة...');
        
        const opportunities = await contract.checkOpportunities();
        const tokens = opportunities[0];
        const profits = opportunities[1];
        
        AppState.trading.opportunities = [];
        
        if (tokens.length === 0) {
            updateOpportunitiesUI([]);
            updateStatus('📊 لا توجد فرص متاحة حالياً', 'info');
        } else {
            const formattedOpportunities = [];
            
            for (let i = 0; i < tokens.length; i++) {
                formattedOpportunities.push({
                    token: tokens[i],
                    profit: ethers.formatUnits(profits[i], 6),
                    profitWei: profits[i]
                });
            }
            
            AppState.trading.opportunities = formattedOpportunities;
            updateOpportunitiesUI(formattedOpportunities);
            updateStatus(`✅ تم العثور على ${tokens.length} فرصة متاحة`, 'success');
        }
        
    } catch (error) {
        console.error('Scan opportunities error:', error);
        updateStatus('❌ خطأ في فحص الفرص: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function updateOpportunitiesUI(opportunities) {
    const opportunitiesList = document.getElementById('opportunitiesList');
    
    if (!opportunitiesList) return;
    
    if (opportunities.length === 0) {
        opportunitiesList.innerHTML = `
            <div class="opportunity-item">
                <span>لا توجد فرص متاحة حالياً</span>
                <span class="status-badge info">انتظار</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    opportunities.forEach((opp, index) => {
        const tokenName = getTokenName(opp.token);
        const profitValue = parseFloat(opp.profit);
        const profitClass = profitValue > 0 ? 'success' : 'warning';
        
        html += `
            <div class="opportunity-item">
                <div class="opportunity-info">
                    <span class="token-name">${tokenName}</span>
                    <span class="token-address">${formatAddress(opp.token)}</span>
                </div>
                <div class="opportunity-profit">
                    <span class="profit-amount ${profitClass}">$${profitValue.toFixed(2)}</span>
                    <button class="btn btn-sm btn-success" onclick="executeOpportunity(${index})">
                        <i data-feather="zap"></i>
                        تنفيذ
                    </button>
                </div>
            </div>
        `;
    });
    
    opportunitiesList.innerHTML = html;
    initializeIcons();
}

async function executeOpportunity(index) {
    try {
        const opportunity = AppState.trading.opportunities[index];
        if (!opportunity) {
            throw new Error('الفرصة غير موجودة');
        }
        
        showLoading('تنفيذ الفرصة...');
        updateStatus('⏳ تنفيذ فرصة التحكيم...', 'info');
        
        // Calculate optimal trade amount (simplified logic)
        const maxTradeAmount = ethers.parseUnits(AppState.trading.settings.maxTradeAmount, 6);
        const tradeAmount = opportunity.profitWei.gt(maxTradeAmount) ? maxTradeAmount : opportunity.profitWei;
        
        // Execute arbitrage
        const tx = await contract.executeArbitrage(
            opportunity.token,
            tradeAmount,
            '0x' // Empty data for simple arbitrage
        );
        
        updateStatus('⏳ انتظار تأكيد المعاملة...', 'info');
        const receipt = await tx.wait();
        
        updateStatus('✅ تم تنفيذ الفرصة بنجاح', 'success');
        showNotification(`تم تنفيذ فرصة بربح $${opportunity.profit}`, 'success');
        
        // Refresh data
        await Promise.all([
            refreshStats(),
            refreshBalances(),
            refreshRecentTrades(),
            scanOpportunities()
        ]);
        
    } catch (error) {
        console.error('Execute opportunity error:', error);
        updateStatus('❌ خطأ في تنفيذ الفرصة: ' + error.message, 'error');
        showNotification('فشل في تنفيذ الفرصة', 'error');
    } finally {
        hideLoading();
    }
}

async function scanAndExecuteOpportunities() {
    try {
        if (!AppState.trading.autoTrading || !contract) return;
        
        const opportunities = await contract.checkOpportunities();
        const tokens = opportunities[0];
        const profits = opportunities[1];
        
        if (tokens.length === 0) return;
        
        const minProfitThreshold = ethers.parseUnits(AppState.trading.settings.minProfitThreshold, 6);
        
        for (let i = 0; i < tokens.length; i++) {
            if (profits[i].gte(minProfitThreshold)) {
                try {
                    const maxTradeAmount = ethers.parseUnits(AppState.trading.settings.maxTradeAmount, 6);
                    const tradeAmount = profits[i].gt(maxTradeAmount) ? maxTradeAmount : profits[i];
                    
                    const tx = await contract.executeArbitrage(tokens[i], tradeAmount, '0x');
                    await tx.wait();
                    
                    console.log(`Auto-executed arbitrage for ${getTokenName(tokens[i])} with profit $${ethers.formatUnits(profits[i], 6)}`);
                    
                } catch (error) {
                    console.error('Auto-execution error:', error);
                }
            }
        }
        
        // Update stats after auto-execution
        await refreshStats();
        
    } catch (error) {
        console.error('Scan and execute opportunities error:', error);
    }
}

// Portfolio Management
async function refreshBalances() {
    try {
        if (!contract) return;
        
        updateStatus('⏳ تحديث الأرصدة...', 'info');
        
        const balances = await contract.getBalances();
        
        const balanceData = [
            { name: 'USDC', balance: ethers.formatUnits(balances[0], 6), icon: '💵' },
            { name: 'USDT', balance: ethers.formatUnits(balances[1], 6), icon: '💵' },
            { name: 'DAI', balance: ethers.formatEther(balances[2]), icon: '💎' },
            { name: 'WETH', balance: ethers.formatEther(balances[3]), icon: '🔷' },
            { name: 'WMATIC', balance: ethers.formatEther(balances[4]), icon: '🟣' }
        ];
        
        updateBalancesUI(balanceData);
        updateStatus('✅ تم تحديث الأرصدة', 'success');
        
    } catch (error) {
        console.error('Refresh balances error:', error);
        updateStatus('❌ خطأ في تحديث الأرصدة: ' + error.message, 'error');
    }
}

function updateBalancesUI(balanceData) {
    const balancesGrid = document.getElementById('balancesGrid');
    
    if (!balancesGrid) return;
    
    let html = '';
    balanceData.forEach(token => {
        const balance = parseFloat(token.balance);
        const balanceClass = balance > 0 ? 'balance-positive' : 'balance-zero';
        
        html += `
            <div class="balance-card ${balanceClass}">
                <div class="currency-icon" style="background: ${getTokenColor(token.name)}">
                    ${token.icon}
                </div>
                <div class="currency-name">${token.name}</div>
                <div class="currency-amount">${balance.toFixed(6)}</div>
            </div>
        `;
    });
    
    balancesGrid.innerHTML = html;
}

async function depositFunds() {
    try {
        const tokenSelect = document.getElementById('depositToken');
        const amountInput = document.getElementById('depositAmount');
        
        if (!tokenSelect || !amountInput) {
            throw new Error('عناصر النموذج غير موجودة');
        }
        
        const token = tokenSelect.value;
        const amount = amountInput.value;
        
        if (!amount || parseFloat(amount) <= 0) {
            throw new Error('يرجى إدخال مبلغ صحيح');
        }
        
        showLoading('جاري الإيداع...');
        updateStatus('⏳ جاري إيداع الأموال...', 'info');
        
        const tokenAddress = TOKEN_ADDRESSES[token];
        const amountWei = ethers.parseUnits(amount, token === 'USDC' || token === 'USDT' ? 6 : 18);
        
        // For this example, we'll use a simplified deposit method
        // In reality, you'd need to handle token approvals first
        const tx = await contract.depositToken(tokenAddress, amountWei);
        await tx.wait();
        
        updateStatus('✅ تم الإيداع بنجاح', 'success');
        showNotification(`تم إيداع ${amount} ${token} بنجاح`, 'success');
        
        // Clear input
        amountInput.value = '';
        
        // Refresh balances
        await refreshBalances();
        
    } catch (error) {
        console.error('Deposit error:', error);
        updateStatus('❌ خطأ في الإيداع: ' + error.message, 'error');
        showNotification('فشل في الإيداع', 'error');
    } finally {
        hideLoading();
    }
}

async function withdrawFunds() {
    try {
        const tokenSelect = document.getElementById('withdrawToken');
        const amountInput = document.getElementById('withdrawAmount');
        
        if (!tokenSelect || !amountInput) {
            throw new Error('عناصر النموذج غير موجودة');
        }
        
        const token = tokenSelect.value;
        const amount = amountInput.value;
        
        if (!amount || parseFloat(amount) <= 0) {
            throw new Error('يرجى إدخال مبلغ صحيح');
        }
        
        showLoading('جاري السحب...');
        updateStatus('⏳ جاري سحب الأموال...', 'info');
        
        const tokenAddress = TOKEN_ADDRESSES[token];
        const amountWei = ethers.parseUnits(amount, token === 'USDC' || token === 'USDT' ? 6 : 18);
        
        const tx = await contract.withdrawToken(tokenAddress, amountWei);
        await tx.wait();
        
        updateStatus('✅ تم السحب بنجاح', 'success');
        showNotification(`تم سحب ${amount} ${token} بنجاح`, 'success');
        
        // Clear input
        amountInput.value = '';
        
        // Refresh balances
        await refreshBalances();
        
    } catch (error) {
        console.error('Withdraw error:', error);
        updateStatus('❌ خطأ في السحب: ' + error.message, 'error');
        showNotification('فشل في السحب', 'error');
    } finally {
        hideLoading();
    }
}

// Trading History
async function loadTradeHistory() {
    try {
        if (!contract) return;
        
        const filterPeriod = document.getElementById('filterPeriod')?.value || 'all';
        const filterType = document.getElementById('filterType')?.value || 'all';
        
        updateStatus('⏳ تحميل سجل المعاملات...', 'info');
        
        // Get trade history (simplified - in reality you'd implement proper filtering)
        const trades = await contract.getTradeHistory(50, 0);
        
        const filteredTrades = trades.filter(trade => {
            // Apply filters here
            return true; // Simplified
        });
        
        updateHistoryTable(filteredTrades);
        updateStatus('✅ تم تحميل سجل المعاملات', 'success');
        
    } catch (error) {
        console.error('Load trade history error:', error);
        updateStatus('❌ خطأ في تحميل السجل: ' + error.message, 'error');
        
        // Show placeholder data
        updateHistoryTable([]);
    }
}

function updateHistoryTable(trades) {
    const tbody = Elements.historyTable?.querySelector('tbody');
    
    if (!tbody) return;
    
    if (trades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    لا توجد معاملات متاحة
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    trades.forEach(trade => {
        const timestamp = new Date(parseInt(trade[0]) * 1000).toLocaleString('ar-EG');
        const token = getTokenName(trade[1]);
        const amount = ethers.formatUnits(trade[2], 6);
        const profit = ethers.formatUnits(trade[3], 6);
        const successful = trade[4];
        const gasUsed = trade[5].toString();
        
        html += `
            <tr>
                <td>${timestamp}</td>
                <td>تحكيم</td>
                <td>${token}</td>
                <td>$${amount}</td>
                <td>${gasUsed} gwei</td>
                <td class="${successful ? 'text-success' : 'text-danger'}">
                    ${successful ? '+' : '-'}$${Math.abs(parseFloat(profit)).toFixed(6)}
                </td>
                <td class="tx-hash">0x${Math.random().toString(16).substr(2, 8)}...</td>
                <td>
                    <span class="status-badge ${successful ? 'success' : 'danger'}">
                        ${successful ? 'نجح' : 'فشل'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function refreshRecentTrades() {
    try {
        await loadTradeHistory();
        updateStatus('✅ تم تحديث الصفقات الأخيرة', 'success');
    } catch (error) {
        console.error('Refresh recent trades error:', error);
    }
}

function exportHistory() {
    try {
        // Get table data
        const table = Elements.historyTable;
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        let csvContent = 'التاريخ والوقت,النوع,العملة,المبلغ,رسوم الغاز,الربح/الخسارة,معرف المعاملة,الحالة\n';
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowData = Array.from(cells).map(cell => cell.textContent.trim()).join(',');
            csvContent += rowData + '\n';
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `flash-bot-history-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('تم تصدير السجل بنجاح', 'success');
        
    } catch (error) {
        console.error('Export history error:', error);
        showNotification('فشل في تصدير السجل', 'error');
    }
}

// Charts
function initializeCharts() {
    try {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping chart initialization');
            return;
        }
        
        initializePortfolioChart();
        initializePerformanceChart();
        
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
}

function initializePortfolioChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['USDC', 'USDT', 'DAI', 'WETH', 'WMATIC'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#9b59b6',
                    '#e74c3c'
                ],
                borderWidth: 2,
                borderColor: '#1a1a2e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                }
            }
        }
    });
}

function initializePerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'إجمالي الأرباح ($)',
                data: [],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#b0b3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#b0b3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updatePortfolioChart() {
    if (!portfolioChart || !contract) return;
    
    // This would typically fetch real balance data
    // For now, using placeholder data
    const data = [100, 50, 25, 10, 5]; // Example balances
    
    portfolioChart.data.datasets[0].data = data;
    portfolioChart.update();
}

function updatePerformanceChart() {
    if (!performanceChart || !AppState.trading.stats) return;
    
    // Generate sample performance data
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }));
        
        // Sample cumulative profit data
        data.push(Math.random() * 100);
    }
    
    performanceChart.data.labels = labels;
    performanceChart.data.datasets[0].data = data;
    performanceChart.update();
}

// Analytics
async function updateAnalytics() {
    try {
        if (!contract) return;
        
        // Update KPIs with real data
        const stats = AppState.trading.stats;
        
        // Calculate additional metrics
        const totalTrades = parseInt(stats.totalTrades || 0);
        const successfulTrades = parseInt(stats.successfulTrades || 0);
        const failedTrades = totalTrades - successfulTrades;
        
        // Update analytics displays
        const totalTradesAnalytics = document.getElementById('totalTradesAnalytics');
        const winningTrades = document.getElementById('winningTrades');
        const losingTrades = document.getElementById('losingTrades');
        const avgTradeTime = document.getElementById('avgTradeTime');
        const maxLoss = document.getElementById('maxLoss');
        const sharpeRatio = document.getElementById('sharpeRatio');
        
        if (totalTradesAnalytics) totalTradesAnalytics.textContent = totalTrades;
        if (winningTrades) winningTrades.textContent = successfulTrades;
        if (losingTrades) losingTrades.textContent = failedTrades;
        if (avgTradeTime) avgTradeTime.textContent = '15s'; // Sample data
        if (maxLoss) maxLoss.textContent = '$5.00'; // Sample data
        if (sharpeRatio) sharpeRatio.textContent = '1.25'; // Sample data
        
        // Monthly return calculation
        const monthlyReturn = document.getElementById('monthlyReturn');
        if (monthlyReturn) {
            const monthlyProfit = parseFloat(stats.totalProfit || 0) * 0.3; // Sample calculation
            monthlyReturn.textContent = monthlyProfit > 0 ? `+${monthlyProfit.toFixed(2)}%` : `${monthlyProfit.toFixed(2)}%`;
            monthlyReturn.className = monthlyProfit > 0 ? 'kpi-value' : 'kpi-value negative';
        }
        
    } catch (error) {
        console.error('Update analytics error:', error);
    }
}

// Utility Functions
async function refreshStats() {
    await loadStats();
}

function updateStatus(message, type = 'info') {
    if (Elements.statusBar && Elements.statusText) {
        Elements.statusText.textContent = message;
        Elements.statusBar.className = `status-bar ${type}`;
        
        console.log(`Status (${type}): ${message}`);
    }
}

function showLoading(message = 'جاري المعالجة...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const loadingText = overlay.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getNetworkDisplayName(networkName) {
    const networks = {
        'matic': 'Polygon Mainnet',
        'maticmum': 'Polygon Mumbai',
        'homestead': 'Ethereum Mainnet',
        'goerli': 'Goerli Testnet'
    };
    
    return networks[networkName] || networkName;
}

function getTokenName(address) {
    const tokenNames = {
        [TOKEN_ADDRESSES.USDC]: 'USDC',
        [TOKEN_ADDRESSES.USDT]: 'USDT',
        [TOKEN_ADDRESSES.DAI]: 'DAI',
        [TOKEN_ADDRESSES.WETH]: 'WETH',
        [TOKEN_ADDRESSES.WMATIC]: 'WMATIC'
    };
    
    return tokenNames[address] || formatAddress(address);
}

function getTokenColor(tokenName) {
    const colors = {
        'USDC': '#3498db',
        'USDT': '#2ecc71',
        'DAI': '#f39c12',
        'WETH': '#9b59b6',
        'WMATIC': '#e74c3c'
    };
    
    return colors[tokenName] || '#95a5a6';
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// MetaMask Event Handlers
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        console.log('User disconnected wallet');
        location.reload();
    } else {
        // User switched accounts
        console.log('User switched accounts');
        if (isConnected) {
            location.reload();
        }
    }
}

function handleChainChanged(chainId) {
    console.log('Chain changed:', chainId);
    // Reload on network change
    location.reload();
}

function handleDisconnect() {
    console.log('MetaMask disconnected');
    location.reload();
}

// Auto-refresh data every 30 seconds
setInterval(async () => {
    if (isConnected && isContractConnected && AppState.ui.currentTab !== 'connection') {
        try {
            await refreshStats();
            
            if (AppState.ui.currentTab === 'dashboard') {
                await refreshRecentTrades();
            }
            
            if (AppState.ui.currentTab === 'portfolio') {
                await refreshBalances();
            }
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }
}, 30000);

// Expose functions for HTML onclick events
window.executeOpportunity = executeOpportunity;
window.showModal = showModal;
window.hideModal = hideModal;

console.log('🎉 Flash Loan Bot Advanced Interface JavaScript loaded successfully!');
   // إعداد مستمعي أحداث MetaMask
if (window.ethereum) {
    // عند تغيير الحسابات
    window.ethereum.on('accountsChanged', function (accounts) {
        console.log('🔄 Accounts changed:', accounts);
        if (accounts.length === 0) {
            console.log('👋 User disconnected wallet');
            location.reload();
        } else {
            console.log('🔄 User switched to account:', accounts[0]);
            if (isConnected) {
                location.reload();
            }
        }
    });
    
    // عند تغيير الشبكة
    window.ethereum.on('chainChanged', function (chainId) {
        console.log('🔄 Chain changed to:', chainId);
        location.reload();
    });
    
    // عند قطع الاتصال
    window.ethereum.on('disconnect', function () {
        console.log('👋 MetaMask disconnected');
        location.reload();
    });
    
    console.log('✅ MetaMask event listeners setup complete');
}

