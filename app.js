// Polygon Network Configuration
const POLYGON_CONFIG = {
    chainId: '0x89', // 137 in hex
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
};

// Token Addresses on Polygon
const TOKENS = {
    USDC: {
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        symbol: 'USDC',
        decimals: 6,
        logo: 'UC'
    },
    USDT: {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        symbol: 'USDT',
        decimals: 6,
        logo: 'UT'
    },
    DAI: {
        address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        symbol: 'DAI',
        decimals: 18,
        logo: 'DA'
    },
    WETH: {
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        symbol: 'WETH',
        decimals: 18,
        logo: 'WE'
    },
    WMATIC: {
        address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        symbol: 'WMATIC',
        decimals: 18,
        logo: 'WM'
    }
};

// ERC20 ABI
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

// Flash Loan Bot ABI (placeholder - replace with actual ABI)
const FLASHLOAN_ABI = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function minProfitThreshold() view returns (uint256)",
    "function maxSlippage() view returns (uint256)",
    "function totalProfit() view returns (uint256)",
    "function totalTrades() view returns (uint256)",
    "function emergencyStop() external",
    "function pause() external",
    "function unpause() external",
    "function setMinProfitThreshold(uint256 _threshold) external",
    "function setMaxSlippage(uint256 _slippage) external",
    "function withdrawToken(address token, uint256 amount) external",
    "function withdrawAllTokens() external",
    "event ProfitGenerated(uint256 profit, address token)",
    "event TradeExecuted(address tokenIn, address tokenOut, uint256 amountIn, uint256 profit)"
];

// Global Variables
let provider = null;
let signer = null;
let userAddress = null;
let flashLoanContract = null;
let contractAddress = null;
let isConnected = false;
let botRunning = false;
let monitoringInterval = null;
let profitChart = null;
let updateInterval = null;

// Application State
const appState = {
    totalProfit: 0,
    totalTrades: 0,
    todayProfit: 0,
    todayTrades: 0,
    gasFees: 0,
    successRate: 0,
    opportunities: [],
    transactions: [],
    balances: {},
    settings: {
        minProfitThreshold: 5,
        maxSlippage: 3,
        maxGasLimit: 500000
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Flash Loan Bot Interface Starting...');
    
    // Initialize Feather Icons
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load saved settings
    loadSavedSettings();
    
    // Setup token grid
    setupTokenGrid();
    
    // Check if wallet is already connected, but don't block the interface
    setTimeout(async () => {
        const isAlreadyConnected = await checkExistingWalletConnection();
        if (!isAlreadyConnected) {
            // Show wallet modal only if not already connected
            document.getElementById('walletModal').classList.remove('hidden');
        }
    }, 500);
});

// Setup Event Listeners
function setupEventListeners() {
    // Wallet connection
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
    
    // Add skip/demo mode button for testing
    const walletModal = document.getElementById('walletModal');
    if (walletModal) {
        const skipButton = document.createElement('button');
        skipButton.className = 'btn btn--outline btn--full-width';
        skipButton.innerHTML = '<i data-feather="skip-forward"></i> تخطي (وضع التجريب)';
        skipButton.style.marginTop = '10px';
        skipButton.addEventListener('click', enterDemoMode);
        
        const connectButton = document.getElementById('connectWalletBtn');
        if (connectButton && connectButton.parentNode) {
            connectButton.parentNode.insertBefore(skipButton, connectButton.nextSibling);
        }
    }
    
    // Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Contract setup
    const verifyBtn = document.getElementById('verifyContractBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    if (verifyBtn) verifyBtn.addEventListener('click', verifyContract);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Bot controls
    const startBotBtn = document.getElementById('startBotBtn');
    const pauseBotBtn = document.getElementById('pauseBotBtn');
    const emergencyStopBtn = document.getElementById('emergencyStopBtn');
    
    if (startBotBtn) startBotBtn.addEventListener('click', startBot);
    if (pauseBotBtn) pauseBotBtn.addEventListener('click', pauseBot);
    if (emergencyStopBtn) emergencyStopBtn.addEventListener('click', emergencyStop);
    
    // Wallet operations
    const refreshBalancesBtn = document.getElementById('refreshBalances');
    const withdrawForm = document.getElementById('withdrawForm');
    const emergencyWithdrawBtn = document.getElementById('emergencyWithdrawBtn');
    
    if (refreshBalancesBtn) refreshBalancesBtn.addEventListener('click', loadContractBalances);
    if (withdrawForm) withdrawForm.addEventListener('submit', handleWithdraw);
    if (emergencyWithdrawBtn) emergencyWithdrawBtn.addEventListener('click', emergencyWithdraw);
    
    // Monitoring
    const refreshTransactionsBtn = document.getElementById('refreshTransactions');
    const filterStatusSelect = document.getElementById('filterStatus');
    
    if (refreshTransactionsBtn) refreshTransactionsBtn.addEventListener('click', loadTransactions);
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', filterTransactions);
    
    // Notification close
    const notificationClose = document.getElementById('notificationClose');
    if (notificationClose) notificationClose.addEventListener('click', hideNotification);
    
    // Modal controls
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideConfirmModal);
    
    // Withdraw token selection
    const withdrawTokenSelect = document.getElementById('withdrawToken');
    if (withdrawTokenSelect) withdrawTokenSelect.addEventListener('change', updateAvailableBalance);
}

// Demo Mode for Testing
function enterDemoMode() {
    console.log('🎭 Entering Demo Mode');
    
    // Hide wallet modal
    document.getElementById('walletModal').classList.add('hidden');
    
    // Show main app
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Set demo state
    isConnected = true;
    userAddress = '0x1234567890123456789012345678901234567890';
    
    // Update wallet info with demo data
    updateWalletInfo();
    
    // Set demo wallet balance
    document.getElementById('walletBalance').textContent = '150.45 MATIC';
    
    // Populate demo data
    populateDemoData();
    
    showNotification('وضع التجريب مفعل - جميع البيانات تجريبية', 'warning');
    
    // Update icons
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

// Populate Demo Data
function populateDemoData() {
    appState.totalProfit = 1247.58;
    appState.totalTrades = 1834;
    appState.todayProfit = 89.32;
    appState.todayTrades = 12;
    appState.gasFees = 15.67;
    appState.successRate = 87.5;
    
    // Set demo contract address
    contractAddress = '0x1234567890123456789012345678901234567890';
    document.getElementById('contractAddress').value = contractAddress;
    
    // Enable bot controls
    enableBotControls();
    
    // Update stats
    updateStats();
}

// Wallet Connection Functions
async function connectWallet() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.disabled = true;
        connectBtn.innerHTML = '<i data-feather="loader"></i> جاري الاتصال...';
    }
    
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask غير مثبت. يرجى تثبيت MetaMask أولاً أو استخدم وضع التجريب.');
        }
        
        // Initialize provider
        if (typeof ethers === 'undefined') {
            throw new Error('مكتبة Ethers.js غير محملة. يرجى إعادة تحميل الصفحة.');
        }
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Request account access
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts.length === 0) {
            throw new Error('لم يتم منح إذن الوصول للحسابات');
        }
        
        // Get signer and address
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        console.log('✅ Wallet connected:', userAddress);
        
        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== 137) {
            await switchToPolygon();
        }
        
        // Update UI
        isConnected = true;
        document.getElementById('walletModal').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Update wallet info
        updateWalletInfo();
        
        // Load wallet balance
        await updateWalletBalance();
        
        // Setup event listeners for account/network changes
        setupWalletEventListeners();
        
        showNotification('تم الاتصال بالمحفظة بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Wallet connection error:', error);
        showNotification(`خطأ في الاتصال: ${error.message}`, 'error');
    } finally {
        // Reset button
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i data-feather="wallet"></i> اتصال بـ MetaMask';
            
            setTimeout(() => {
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }, 100);
        }
    }
}

// Check Existing Wallet Connection
async function checkExistingWalletConnection() {
    if (typeof window.ethereum === 'undefined' || typeof ethers === 'undefined') {
        return false;
    }
    
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
            signer = provider.getSigner();
            userAddress = accounts[0];
            
            const network = await provider.getNetwork();
            if (network.chainId === 137) {
                isConnected = true;
                document.getElementById('mainApp').classList.remove('hidden');
                updateWalletInfo();
                await updateWalletBalance();
                setupWalletEventListeners();
                return true;
            }
        }
    } catch (error) {
        console.log('No existing wallet connection found');
    }
    
    return false;
}

async function switchToPolygon() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CONFIG.chainId }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [POLYGON_CONFIG],
                });
            } catch (addError) {
                throw new Error('فشل في إضافة شبكة Polygon');
            }
        } else {
            throw new Error('فشل في التبديل إلى شبكة Polygon');
        }
    }
}

function setupWalletEventListeners() {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else if (accounts[0] !== userAddress) {
                window.location.reload();
            }
        });
        
        window.ethereum.on('chainChanged', (chainId) => {
            if (chainId !== POLYGON_CONFIG.chainId) {
                showNotification('تم تغيير الشبكة. يرجى التبديل إلى Polygon', 'warning');
                disconnectWallet();
            }
        });
    }
}

function disconnectWallet() {
    isConnected = false;
    provider = null;
    signer = null;
    userAddress = null;
    flashLoanContract = null;
    
    // Clear intervals
    if (monitoringInterval) clearInterval(monitoringInterval);
    if (updateInterval) clearInterval(updateInterval);
    
    // Reset UI
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('walletModal').classList.remove('hidden');
    
    showNotification('تم قطع الاتصال بالمحفظة', 'success');
}

// Update Wallet Info
function updateWalletInfo() {
    const addressElement = document.getElementById('walletAddress');
    if (addressElement && userAddress) {
        addressElement.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(-4)}`;
    }
}

async function updateWalletBalance() {
    if (!provider || !userAddress) return;
    
    try {
        const balance = await provider.getBalance(userAddress);
        const balanceInMatic = ethers.utils.formatEther(balance);
        
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            balanceElement.textContent = `${parseFloat(balanceInMatic).toFixed(4)} MATIC`;
        }
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            balanceElement.textContent = '-- MATIC';
        }
    }
}

// Tab Navigation
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    const activeSection = document.getElementById(tabName);
    if (activeSection) activeSection.classList.add('active');
    
    // Load section-specific data
    loadSectionData(tabName);
    
    // Update feather icons
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

// Load Section Data
async function loadSectionData(section) {
    switch (section) {
        case 'setup':
            break;
        case 'control':
            await updateNetworkStats();
            await loadOpportunities();
            break;
        case 'monitoring':
            await loadTransactions();
            updateStats();
            setTimeout(() => initializeProfitChart(), 200);
            break;
        case 'wallet':
            await loadContractBalances();
            await loadTransactionHistory();
            break;
    }
}

// Setup Token Grid
function setupTokenGrid() {
    const grid = document.getElementById('tokensGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(TOKENS).forEach(([symbol, token]) => {
        const tokenElement = document.createElement('div');
        tokenElement.className = 'token-item supported';
        tokenElement.innerHTML = `
            <div class="token-logo">${token.logo}</div>
            <span>${token.symbol}</span>
        `;
        grid.appendChild(tokenElement);
    });
}

// Contract Verification
async function verifyContract() {
    const addressInput = document.getElementById('contractAddress');
    if (!addressInput) return;
    
    const address = addressInput.value.trim();
    
    if (!address || !ethers.utils.isAddress(address)) {
        showNotification('عنوان العقد غير صحيح', 'error');
        return;
    }
    
    // Show loading for verification
    const verifyBtn = document.getElementById('verifyContractBtn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i data-feather="loader"></i> جاري التحقق...';
    }
    
    try {
        let contractInfo = '';
        
        if (provider) {
            // Try to verify with actual blockchain
            const contract = new ethers.Contract(address, FLASHLOAN_ABI, provider);
            const owner = await contract.owner().catch(() => 'غير متاح');
            const paused = await contract.paused().catch(() => false);
            
            contractInfo = `
                <div class="contract-info-grid">
                    <div class="info-item">
                        <span class="info-label">مالك العقد:</span>
                        <span class="info-value">${owner.toString().substring(0, 10)}...</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">حالة العقد:</span>
                        <span class="info-value ${paused ? 'text-warning' : 'text-success'}">
                            ${paused ? 'متوقف' : 'نشط'}
                        </span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">رابط العقد:</span>
                        <a href="https://polygonscan.com/address/${address}" target="_blank" class="info-value">
                            عرض على Polygonscan
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Demo mode verification
            contractInfo = `
                <div class="contract-info-grid">
                    <div class="info-item">
                        <span class="info-label">مالك العقد:</span>
                        <span class="info-value">${address.substring(0, 10)}...</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">حالة العقد:</span>
                        <span class="info-value text-success">نشط (وضع تجريبي)</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">إجمالي الأرباح:</span>
                        <span class="info-value">1247.58 USD</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">إجمالي الصفقات:</span>
                        <span class="info-value">1,834</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">رابط العقد:</span>
                        <a href="https://polygonscan.com/address/${address}" target="_blank" class="info-value">
                            عرض على Polygonscan
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Update contract info display
        const infoContainer = document.getElementById('contractInfo');
        if (infoContainer) {
            infoContainer.innerHTML = contractInfo;
        }
        
        // Store contract info
        contractAddress = address;
        if (provider) {
            flashLoanContract = new ethers.Contract(address, FLASHLOAN_ABI, signer);
        }
        
        // Save to localStorage
        localStorage.setItem('flashLoanContractAddress', address);
        
        // Enable bot controls
        enableBotControls();
        
        showNotification('تم التحقق من العقد بنجاح', 'success');
        
    } catch (error) {
        console.error('Contract verification error:', error);
        showNotification(`فشل في التحقق من العقد`, 'error');
        
        // Show error info
        const infoContainer = document.getElementById('contractInfo');
        if (infoContainer) {
            infoContainer.innerHTML = `
                <div class="info-placeholder">
                    <i data-feather="alert-triangle"></i>
                    <p>فشل في التحقق من العقد. تأكد من صحة العنوان وحالة الشبكة.</p>
                </div>
            `;
        }
    } finally {
        // Reset button
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i data-feather="search"></i> التحقق من العقد';
            
            setTimeout(() => {
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }, 100);
        }
    }
}

// Enable Bot Controls
function enableBotControls() {
    const startBtn = document.getElementById('startBotBtn');
    const pauseBtn = document.getElementById('pauseBotBtn');
    
    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = false;
}

// Bot Control Functions
async function startBot() {
    if (!contractAddress) {
        showNotification('يرجى التحقق من العقد أولاً', 'error');
        return;
    }
    
    showConfirmModal(
        'تشغيل البوت',
        'هل أنت متأكد من تشغيل بوت التداول؟ سيبدأ البحث عن الفرص وتنفيذ الصفقات تلقائياً.',
        'تكلفة الغاز المتوقعة: ~0.1 MATIC',
        async () => {
            const startBtn = document.getElementById('startBotBtn');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.innerHTML = '<i data-feather="loader"></i> جاري التشغيل...';
            }
            
            try {
                if (flashLoanContract) {
                    // Real blockchain transaction
                    const isPaused = await flashLoanContract.paused();
                    
                    if (isPaused) {
                        const tx = await flashLoanContract.unpause();
                        await tx.wait();
                    }
                }
                
                // Update UI
                updateBotStatus(true);
                startMonitoring();
                
                showNotification('تم تشغيل البوت بنجاح', 'success');
                
            } catch (error) {
                console.error('Error starting bot:', error);
                showNotification(`فشل في تشغيل البوت: ${error.message}`, 'error');
            } finally {
                // Reset button
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i data-feather="play"></i> تشغيل البوت';
                    
                    setTimeout(() => {
                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }, 100);
                }
            }
        }
    );
}

async function pauseBot() {
    showConfirmModal(
        'إيقاف البوت مؤقتاً',
        'هل تريد إيقاف البوت مؤقتاً؟ سيتم إيقاف البحث عن الفرص مؤقتاً.',
        '',
        async () => {
            try {
                if (flashLoanContract) {
                    const tx = await flashLoanContract.pause();
                    await tx.wait();
                }
                
                updateBotStatus(false);
                stopMonitoring();
                
                showNotification('تم إيقاف البوت مؤقتاً', 'success');
                
            } catch (error) {
                console.error('Error pausing bot:', error);
                showNotification(`فشل في إيقاف البوت: ${error.message}`, 'error');
            }
        }
    );
}

async function emergencyStop() {
    showConfirmModal(
        'إيقاف طوارئ',
        'تحذير: سيتم إيقاف البوت نهائياً وإلغاء جميع العمليات الجارية. هذا الإجراء لا يمكن التراجع عنه.',
        'سيتم إيقاف جميع العمليات فوراً',
        async () => {
            try {
                if (flashLoanContract) {
                    const tx = await flashLoanContract.emergencyStop();
                    await tx.wait();
                }
                
                updateBotStatus(false, 'emergency');
                stopMonitoring();
                
                showNotification('تم تنفيذ إيقاف الطوارئ', 'warning');
                
            } catch (error) {
                console.error('Error in emergency stop:', error);
                showNotification(`فشل في إيقاف الطوارئ: ${error.message}`, 'error');
            }
        }
    );
}

// Update Bot Status
function updateBotStatus(running, type = 'normal') {
    const statusDisplay = document.getElementById('botStatusDisplay');
    if (!statusDisplay) return;
    
    const dot = statusDisplay.querySelector('.status-dot');
    const text = statusDisplay.querySelector('span');
    
    botRunning = running;
    
    if (running) {
        if (dot) {
            dot.classList.remove('stopped', 'paused');
            dot.classList.add('running');
        }
        if (text) text.textContent = 'يعمل';
        
        const startBtn = document.getElementById('startBotBtn');
        const pauseBtn = document.getElementById('pauseBotBtn');
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
    } else {
        if (dot) dot.classList.remove('running');
        
        if (type === 'emergency') {
            if (dot) dot.classList.add('stopped');
            if (text) text.textContent = 'إيقاف طوارئ';
            
            const startBtn = document.getElementById('startBotBtn');
            const pauseBtn = document.getElementById('pauseBotBtn');
            if (startBtn) startBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = true;
        } else {
            if (dot) dot.classList.add('paused');
            if (text) text.textContent = 'متوقف مؤقتاً';
            
            const startBtn = document.getElementById('startBotBtn');
            const pauseBtn = document.getElementById('pauseBotBtn');
            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
        }
    }
}

// Monitoring Functions
function startMonitoring() {
    if (monitoringInterval) clearInterval(monitoringInterval);
    
    monitoringInterval = setInterval(async () => {
        await updateNetworkStats();
        await loadOpportunities();
        await updateStats();
    }, 30000); // Update every 30 seconds
    
    // Start immediate updates
    updateNetworkStats();
    loadOpportunities();
}

function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}

// Network Stats
async function updateNetworkStats() {
    try {
        if (provider) {
            const [gasPrice, blockNumber] = await Promise.all([
                provider.getGasPrice(),
                provider.getBlockNumber()
            ]);
            
            // Update UI
            const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
            const gasPriceEl = document.getElementById('gasPrice');
            const blockNumberEl = document.getElementById('blockNumber');
            
            if (gasPriceEl) gasPriceEl.textContent = `${parseFloat(gasPriceGwei).toFixed(1)} Gwei`;
            if (blockNumberEl) blockNumberEl.textContent = blockNumber.toLocaleString();
        } else {
            // Demo data
            const gasPriceEl = document.getElementById('gasPrice');
            const blockNumberEl = document.getElementById('blockNumber');
            
            if (gasPriceEl) gasPriceEl.textContent = '35.2 Gwei';
            if (blockNumberEl) blockNumberEl.textContent = '52,789,432';
        }
        
        // Mock MATIC price
        const maticPriceEl = document.getElementById('maticPrice');
        if (maticPriceEl) maticPriceEl.textContent = '$0.85';
        
    } catch (error) {
        console.error('Error updating network stats:', error);
    }
}

// Load Opportunities (Mock Implementation)
async function loadOpportunities() {
    const container = document.getElementById('currentOpportunities');
    if (!container) return;
    
    // Mock opportunities data
    const mockOpportunities = [
        {
            pair: 'USDC/USDT',
            profit: '12.45',
            exchange: 'QuickSwap → SushiSwap',
            confidence: 89
        },
        {
            pair: 'DAI/USDC',
            profit: '8.67',
            exchange: 'Uniswap → Curve',
            confidence: 76
        },
        {
            pair: 'WETH/USDC',
            profit: '23.12',
            exchange: 'Balancer → dYdX',
            confidence: 94
        }
    ];
    
    container.innerHTML = '';
    
    if (mockOpportunities.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i data-feather="search"></i>
                <p>لم يتم العثور على فرص مربحة حالياً</p>
            </div>
        `;
    } else {
        mockOpportunities.forEach(opp => {
            const oppElement = document.createElement('div');
            oppElement.className = 'opportunity-item';
            oppElement.innerHTML = `
                <div class="opportunity-details">
                    <div class="opportunity-pair">${opp.pair}</div>
                    <div class="opportunity-exchange">${opp.exchange}</div>
                </div>
                <div class="opportunity-profit">+$${opp.profit}</div>
            `;
            container.appendChild(oppElement);
        });
    }
    
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

// Statistics
function updateStats() {
    const todayTradesEl = document.getElementById('todayTrades');
    const todayProfitEl = document.getElementById('todayProfit');
    const todayGasFeesEl = document.getElementById('todayGasFees');
    const successRateEl = document.getElementById('successRate');
    
    if (todayTradesEl) todayTradesEl.textContent = appState.todayTrades;
    if (todayProfitEl) todayProfitEl.textContent = `$${appState.todayProfit.toFixed(2)}`;
    if (todayGasFeesEl) todayGasFeesEl.textContent = `$${appState.gasFees.toFixed(2)}`;
    
    const rate = appState.todayTrades > 0 ? ((appState.todayTrades - 1) / appState.todayTrades * 100) : 0;
    if (successRateEl) successRateEl.textContent = `${rate.toFixed(1)}%`;
}

// Chart Initialization
function initializeProfitChart() {
    const canvas = document.getElementById('profitChart');
    if (!canvas) return;
    
    // Destroy existing chart
    if (profitChart) {
        profitChart.destroy();
        profitChart = null;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const hourlyData = generateHourlyProfitData();
    
    try {
        profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hourlyData.labels,
                datasets: [{
                    label: 'الأرباح بالساعة',
                    data: hourlyData.profits,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
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
                            font: {
                                family: 'Cairo'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating profit chart:', error);
    }
}

function generateHourlyProfitData() {
    const labels = [];
    const profits = [];
    
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(Date.now() - i * 60 * 60 * 1000);
        labels.push(hour.toLocaleTimeString('ar-SA', { hour: '2-digit' }));
        profits.push(Math.random() * 50 + 10);
    }
    
    return { labels, profits };
}

// Transaction Management
async function loadTransactions() {
    const container = document.getElementById('transactionsTable');
    if (!container) return;
    
    // Mock transactions for demonstration
    const mockTransactions = [
        {
            hash: '0x1234567890abcdef1234567890abcdef12345678',
            type: 'Flash Loan Arbitrage',
            status: 'success',
            profit: '12.45',
            timestamp: Date.now() - 300000
        },
        {
            hash: '0x2345678901bcdef12345678901bcdef123456789',
            type: 'Cross-DEX Arbitrage',
            status: 'success',
            profit: '8.67',
            timestamp: Date.now() - 600000
        },
        {
            hash: '0x3456789012cdef123456789012cdef1234567890',
            type: 'Triangular Arbitrage',
            status: 'failed',
            profit: '0.00',
            timestamp: Date.now() - 900000
        }
    ];
    
    if (mockTransactions.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i data-feather="database"></i>
                <p>لا توجد معاملات بعد</p>
            </div>
        `;
    } else {
        let html = '';
        mockTransactions.forEach(tx => {
            html += `
                <div class="transaction-item">
                    <div class="transaction-details">
                        <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank" class="transaction-hash">
                            ${tx.hash.substring(0, 20)}...
                        </a>
                        <div class="transaction-time">
                            ${new Date(tx.timestamp).toLocaleString('ar-SA')}
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">
                            ${tx.type}
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <div class="transaction-status ${tx.status}">${getStatusText(tx.status)}</div>
                        <div class="${tx.status === 'success' ? 'text-success' : 'text-error'}">
                            ${tx.status === 'success' ? '+' : ''}$${tx.profit}
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }
    
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

function getStatusText(status) {
    const statusMap = {
        'success': 'نجح',
        'failed': 'فشل',
        'pending': 'معلق'
    };
    return statusMap[status] || status;
}

function filterTransactions() {
    // Implementation for filtering transactions
    loadTransactions();
}

// Wallet Functions
async function loadContractBalances() {
    const container = document.getElementById('contractBalances');
    if (!container) return;
    
    try {
        const balances = [];
        
        if (provider && contractAddress) {
            // Real blockchain data
            for (const [symbol, token] of Object.entries(TOKENS)) {
                try {
                    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
                    const balance = await tokenContract.balanceOf(contractAddress);
                    const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
                    
                    balances.push({
                        symbol,
                        balance: formattedBalance,
                        token: token
                    });
                } catch (error) {
                    console.error(`Error loading ${symbol} balance:`, error);
                    balances.push({
                        symbol,
                        balance: '0.00',
                        token: token
                    });
                }
            }
        } else {
            // Demo data
            balances.push(
                { symbol: 'USDC', balance: '1250.45', token: TOKENS.USDC },
                { symbol: 'USDT', balance: '890.23', token: TOKENS.USDT },
                { symbol: 'DAI', balance: '567.89', token: TOKENS.DAI },
                { symbol: 'WETH', balance: '0.245', token: TOKENS.WETH },
                { symbol: 'WMATIC', balance: '1450.67', token: TOKENS.WMATIC }
            );
        }
        
        // Update UI
        container.innerHTML = '';
        
        balances.forEach(bal => {
            const balanceElement = document.createElement('div');
            balanceElement.className = 'balance-item';
            balanceElement.innerHTML = `
                <div class="balance-token">
                    <div class="token-logo">${bal.token.logo}</div>
                    <div>
                        <div>${bal.token.symbol}</div>
                        <div class="balance-usd">$${(parseFloat(bal.balance) * 1).toFixed(2)}</div>
                    </div>
                </div>
                <div class="balance-amount">${parseFloat(bal.balance).toFixed(4)}</div>
            `;
            container.appendChild(balanceElement);
        });
        
        appState.balances = balances;
        
    } catch (error) {
        console.error('Error loading balances:', error);
        container.innerHTML = `
            <div class="no-data">
                <i data-feather="alert-triangle"></i>
                <p>خطأ في تحميل الأرصدة</p>
            </div>
        `;
    }
    
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

function updateAvailableBalance() {
    const tokenSelect = document.getElementById('withdrawToken');
    const availableBalanceSpan = document.getElementById('availableBalance');
    const withdrawBtn = document.getElementById('withdrawBtn');
    
    if (!tokenSelect || !availableBalanceSpan || !withdrawBtn) return;
    
    const selectedToken = tokenSelect.value;
    if (selectedToken && appState.balances) {
        const tokenData = Object.values(TOKENS).find(t => t.address === selectedToken);
        const balanceData = appState.balances.find(b => b.token.address === selectedToken);
        
        if (balanceData) {
            availableBalanceSpan.textContent = `${parseFloat(balanceData.balance).toFixed(4)} ${tokenData.symbol}`;
            withdrawBtn.disabled = false;
        }
    } else {
        availableBalanceSpan.textContent = '--';
        withdrawBtn.disabled = true;
    }
}

async function handleWithdraw(e) {
    e.preventDefault();
    
    const tokenAddressInput = document.getElementById('withdrawToken');
    const amountInput = document.getElementById('withdrawAmount');
    
    if (!tokenAddressInput || !amountInput) return;
    
    const tokenAddress = tokenAddressInput.value;
    const amount = parseFloat(amountInput.value);
    
    if (!tokenAddress || !amount || amount <= 0) {
        showNotification('يرجى ملء جميع الحقول بشكل صحيح', 'error');
        return;
    }
    
    const tokenData = Object.values(TOKENS).find(t => t.address === tokenAddress);
    
    showConfirmModal(
        'تأكيد السحب',
        `هل تريد سحب ${amount} ${tokenData.symbol}؟`,
        `العنوان: ${tokenAddress}\nالمبلغ: ${amount} ${tokenData.symbol}`,
        async () => {
            try {
                if (flashLoanContract) {
                    const amountWei = ethers.utils.parseUnits(amount.toString(), tokenData.decimals);
                    const tx = await flashLoanContract.withdrawToken(tokenAddress, amountWei);
                    
                    showNotification('تم إرسال معاملة السحب', 'success');
                    await tx.wait();
                    showNotification('تم تنفيذ السحب بنجاح', 'success');
                } else {
                    // Demo mode
                    showNotification('تم تنفيذ السحب بنجاح (وضع تجريبي)', 'success');
                }
                
                // Refresh balances
                await loadContractBalances();
                
                // Clear form
                const form = document.getElementById('withdrawForm');
                if (form) form.reset();
                updateAvailableBalance();
                
            } catch (error) {
                console.error('Withdraw error:', error);
                showNotification(`فشل في السحب: ${error.message}`, 'error');
            }
        }
    );
}

async function emergencyWithdraw() {
    showConfirmModal(
        'سحب طوارئ',
        'تحذير: سيتم سحب جميع الأرصدة من العقد فوراً. هذا الإجراء لا يمكن التراجع عنه.',
        'سيتم سحب جميع العملات المتاحة',
        async () => {
            try {
                if (flashLoanContract) {
                    const tx = await flashLoanContract.withdrawAllTokens();
                    showNotification('تم إرسال معاملة سحب الطوارئ', 'success');
                    await tx.wait();
                } else {
                    // Demo mode
                    showNotification('تم تنفيذ سحب الطوارئ (وضع تجريبي)', 'success');
                }
                
                showNotification('تم تنفيذ سحب الطوارئ بنجاح', 'success');
                await loadContractBalances();
                
            } catch (error) {
                console.error('Emergency withdraw error:', error);
                showNotification(`فشل في سحب الطوارئ: ${error.message}`, 'error');
            }
        }
    );
}

async function loadTransactionHistory() {
    const container = document.getElementById('transactionHistory');
    if (!container) return;
    
    // Mock transaction history
    const mockHistory = [
        { type: 'withdraw', currency: 'USDC', amount: 500, date: '2025-01-15 14:30', hash: '0xabc123...' },
        { type: 'profit', currency: 'USDT', amount: 89.32, date: '2025-01-15 12:45', hash: '0xdef456...' },
        { type: 'withdraw', currency: 'DAI', amount: 200, date: '2025-01-14 16:20', hash: '0x789ghi...' }
    ];
    
    container.innerHTML = '';
    
    mockHistory.forEach(tx => {
        const txElement = document.createElement('div');
        txElement.className = 'history-item';
        
        const typeText = tx.type === 'withdraw' ? 'سحب' : 'ربح';
        const sign = tx.type === 'withdraw' ? '-' : '+';
        
        txElement.innerHTML = `
            <div>
                <div><strong>${typeText} ${tx.currency}</strong></div>
                <div style="font-size: 12px; color: var(--color-text-secondary);">${tx.date}</div>
                <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank" style="font-size: 11px;">${tx.hash}</a>
            </div>
            <div class="balance-amount">${sign}${tx.amount}</div>
        `;
        container.appendChild(txElement);
    });
}

// Settings Management
function loadSavedSettings() {
    const savedAddress = localStorage.getItem('flashLoanContractAddress');
    const contractAddressInput = document.getElementById('contractAddress');
    if (savedAddress && contractAddressInput) {
        contractAddressInput.value = savedAddress;
    }
    
    const savedSettings = localStorage.getItem('flashLoanSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            Object.assign(appState.settings, settings);
            
            // Update form fields
            const minProfitInput = document.getElementById('minProfitUSD');
            const maxSlippageInput = document.getElementById('maxSlippage');
            const maxGasLimitInput = document.getElementById('maxGasLimit');
            
            if (minProfitInput) minProfitInput.value = settings.minProfitThreshold || 5;
            if (maxSlippageInput) maxSlippageInput.value = settings.maxSlippage || 3;
            if (maxGasLimitInput) maxGasLimitInput.value = settings.maxGasLimit || 500000;
        } catch (error) {
            console.error('Error loading saved settings:', error);
        }
    }
}

async function saveSettings() {
    const minProfitInput = document.getElementById('minProfitUSD');
    const maxSlippageInput = document.getElementById('maxSlippage');
    const maxGasLimitInput = document.getElementById('maxGasLimit');
    
    if (!minProfitInput || !maxSlippageInput || !maxGasLimitInput) return;
    
    const settings = {
        minProfitThreshold: parseFloat(minProfitInput.value),
        maxSlippage: parseFloat(maxSlippageInput.value),
        maxGasLimit: parseInt(maxGasLimitInput.value)
    };
    
    // Validate settings
    if (settings.minProfitThreshold < 1 || settings.maxSlippage > 10 || settings.maxGasLimit < 100000) {
        showNotification('إعدادات غير صحيحة', 'error');
        return;
    }
    
    showConfirmModal(
        'حفظ الإعدادات',
        'هل تريد حفظ إعدادات التداول الجديدة؟',
        `الحد الأدنى للربح: $${settings.minProfitThreshold}\nالانزلاق الأقصى: ${settings.maxSlippage}%\nحد الغاز: ${settings.maxGasLimit}`,
        async () => {
            try {
                // Save to contract if connected
                if (flashLoanContract) {
                    const minProfitWei = ethers.utils.parseEther(settings.minProfitThreshold.toString());
                    const maxSlippageWei = ethers.utils.parseUnits(settings.maxSlippage.toString(), 2);
                    
                    const tx1 = await flashLoanContract.setMinProfitThreshold(minProfitWei);
                    await tx1.wait();
                    
                    const tx2 = await flashLoanContract.setMaxSlippage(maxSlippageWei);
                    await tx2.wait();
                }
                
                // Save to localStorage
                localStorage.setItem('flashLoanSettings', JSON.stringify(settings));
                Object.assign(appState.settings, settings);
                
                showNotification('تم حفظ الإعدادات بنجاح', 'success');
                
            } catch (error) {
                console.error('Error saving settings:', error);
                showNotification(`فشل في حفظ الإعدادات: ${error.message}`, 'error');
            }
        }
    );
}

// UI Helper Functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    const icon = document.getElementById('notificationIcon');
    
    if (!notification || !text || !icon) return;
    
    text.textContent = message;
    
    // Update icon and class
    notification.className = `notification ${type}`;
    
    if (type === 'error') {
        icon.setAttribute('data-feather', 'alert-circle');
    } else if (type === 'warning') {
        icon.setAttribute('data-feather', 'alert-triangle');
    } else {
        icon.setAttribute('data-feather', 'check-circle');
    }
    
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
    
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.add('hidden');
    }
}

function showConfirmModal(title, message, details, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const detailsEl = document.getElementById('confirmDetails');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    if (!modal || !titleEl || !messageEl || !confirmBtn) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    if (details && detailsEl) {
        detailsEl.textContent = details;
        detailsEl.style.display = 'block';
    } else if (detailsEl) {
        detailsEl.style.display = 'none';
    }
    
    modal.classList.remove('hidden');
    
    // Set up confirm handler
    const handleConfirm = (e) => {
        e.preventDefault();
        hideConfirmModal();
        onConfirm();
        confirmBtn.removeEventListener('click', handleConfirm);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
}

function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (monitoringInterval) clearInterval(monitoringInterval);
    if (updateInterval) clearInterval(updateInterval);
    if (profitChart) profitChart.destroy();
});

console.log('🚀 Flash Loan Bot Interface Loaded Successfully!');