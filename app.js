// Global Variables
let provider, signer, contract;
let isConnected = false;

// Contract ABI - وظائف أساسية للعقد
const CONTRACT_ABI = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function getStats() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function getBalances() view returns (uint256, uint256, uint256, uint256, uint256)",
    "function checkOpportunities() view returns (address[], uint256[])",
    "function emergencyPause() external",
    "function withdrawToken(address token, uint256 amount) external"
];

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const contractSection = document.getElementById('contractSection');
const controlsSection = document.getElementById('controlsSection');
const resultsSection = document.getElementById('resultsSection');
const contractAddressInput = document.getElementById('contractAddress');
const connectContractBtn = document.getElementById('connectContract');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Flash Loan Bot Interface Starting...');
    
    // تحقق من تحميل المكتبات
    checkLibraries();
    
    // تهيئة الأيقونات
    initializeIcons();
    
    // ربط الأحداث
    bindEvents();
});

function checkLibraries() {
    try {
        if (typeof ethers !== 'undefined') {
            updateStatus('✅ تم تحميل مكتبة Ethers.js بنجاح', 'success');
        } else {
            throw new Error('Ethers.js library not loaded');
        }
        
        if (typeof feather !== 'undefined') {
            console.log('✅ Feather Icons loaded successfully');
        } else {
            console.warn('⚠️ Feather Icons not loaded, using fallback');
        }
        
        console.log('🚀 Flash Loan Bot Interface Loaded Successfully!');
        
    } catch (error) {
        updateStatus('❌ خطأ في تحميل المكتبات: ' + error.message, 'error');
        console.error('Library loading error:', error);
    }
}

function initializeIcons() {
    try {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    } catch (error) {
        console.warn('Icon initialization failed:', error);
    }
}

function bindEvents() {
    // ربط أحداث الأزرار
    connectWalletBtn.addEventListener('click', connectWallet);
    connectContractBtn.addEventListener('click', connectContract);
    document.getElementById('getStats').addEventListener('click', getStats);
    document.getElementById('getBalances').addEventListener('click', getBalances);
    document.getElementById('checkOpportunities').addEventListener('click', checkOpportunities);
    document.getElementById('emergencyStop').addEventListener('click', emergencyStop);
}

// Wallet Connection
async function connectWallet() {
    try {
        updateStatus('⏳ جاري الاتصال بالمحفظة...', 'info');
        
        // تحقق من وجود MetaMask
        if (!window.ethereum) {
            throw new Error('MetaMask غير مثبت. يرجى تثبيت MetaMask أولاً.');
        }
        
        // تحقق من تحميل Ethers
        if (typeof ethers === 'undefined') {
            throw new Error('مكتبة Ethers.js غير محملة. يرجى إعادة تحميل الصفحة.');
        }
        
        // طلب الاتصال
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // إنشاء Provider و Signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        
        // الحصول على معلومات المحفظة
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const network = await provider.getNetwork();
        
        // عرض معلومات المحفظة
        document.getElementById('walletAddress').textContent = formatAddress(address);
        document.getElementById('maticBalance').textContent = ethers.formatEther(balance) + ' MATIC';
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('networkName').textContent = network.name === 'matic' ? 'Polygon' : network.name;
        
        // تحديث حالة الاتصال
        isConnected = true;
        document.querySelector('.network-dot').classList.add('connected');
        contractSection.style.display = 'block';
        connectWalletBtn.innerHTML = '<i data-feather="check"></i> متصل بنجاح';
        connectWalletBtn.disabled = true;
        
        // إعادة تهيئة الأيقونات
        initializeIcons();
        
        updateStatus('✅ تم ربط المحفظة بنجاح', 'success');
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        updateStatus('❌ خطأ في ربط المحفظة: ' + error.message, 'error');
        showNotification('❌ فشل في ربط المحفظة: ' + error.message, 'error');
    }
}

// Contract Connection
async function connectContract() {
    try {
        if (!isConnected) {
            throw new Error('يجب ربط المحفظة أولاً');
        }
        
        const contractAddress = contractAddressInput.value.trim();
        if (!contractAddress) {
            throw new Error('يرجى إدخال عنوان العقد');
        }
        
        if (!ethers.isAddress(contractAddress)) {
            throw new Error('عنوان العقد غير صحيح');
        }
        
        updateStatus('⏳ جاري الاتصال بالعقد...', 'info');
        
        // إنشاء اتصال العقد
        contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
        
        // اختبار الاتصال بالعقد
        const owner = await contract.owner();
        const isPaused = await contract.paused();
        
        // تحديث واجهة المستخدم
        controlsSection.style.display = 'block';
        resultsSection.style.display = 'block';
        connectContractBtn.innerHTML = '<i data-feather="check"></i> متصل';
        connectContractBtn.disabled = true;
        
        updateStatus(`✅ تم ربط العقد بنجاح. المالك: ${formatAddress(owner)}`, 'success');
        
        // عرض معلومات العقد
        displayContractInfo(owner, isPaused);
        
        // إعادة تهيئة الأيقونات
        initializeIcons();
        
    } catch (error) {
        console.error('Contract connection error:', error);
        updateStatus('❌ خطأ في ربط العقد: ' + error.message, 'error');
    }
}

// Get Bot Statistics
async function getStats() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ جاري جلب الإحصائيات...', 'info');
        
        const stats = await contract.getStats();
        
        const html = `
            <h3><i data-feather="bar-chart-2"></i> إحصائيات البوت</h3>
            <div class="stat-item">
                <span>📊 إجمالي الصفقات:</span>
                <span class="stat-value">${stats[0].toString()}</span>
            </div>
            <div class="stat-item">
                <span>✅ الصفقات الناجحة:</span>
                <span class="stat-value">${stats[1].toString()}</span>
            </div>
            <div class="stat-item">
                <span>📈 معدل النجاح:</span>
                <span class="stat-value">${stats[2].toString()}%</span>
            </div>
            <div class="stat-item">
                <span>💰 إجمالي الأرباح:</span>
                <span class="stat-value">${ethers.formatUnits(stats[3], 6)} USDC</span>
            </div>
            <div class="stat-item">
                <span>📊 متوسط الربح لكل صفقة:</span>
                <span class="stat-value">${ethers.formatUnits(stats[4], 6)} USDC</span>
            </div>
        `;
        
        document.getElementById('resultsContent').innerHTML = html;
        updateStatus('✅ تم جلب الإحصائيات بنجاح', 'success');
        initializeIcons();
        
    } catch (error) {
        console.error('Stats error:', error);
        updateStatus('❌ خطأ في جلب الإحصائيات: ' + error.message, 'error');
    }
}

// Get Contract Balances
async function getBalances() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ جاري جلب الأرصدة...', 'info');
        
        const balances = await contract.getBalances();
        
        const html = `
            <h3><i data-feather="dollar-sign"></i> أرصدة العقد</h3>
            <div class="stat-item">
                <span>💵 USDC:</span>
                <span class="stat-value">${ethers.formatUnits(balances[0], 6)}</span>
            </div>
            <div class="stat-item">
                <span>💵 USDT:</span>
                <span class="stat-value">${ethers.formatUnits(balances[1], 6)}</span>
            </div>
            <div class="stat-item">
                <span>💎 DAI:</span>
                <span class="stat-value">${ethers.formatEther(balances[2])}</span>
            </div>
            <div class="stat-item">
                <span>🔷 WETH:</span>
                <span class="stat-value">${ethers.formatEther(balances[3])}</span>
            </div>
            <div class="stat-item">
                <span>🟣 WMATIC:</span>
                <span class="stat-value">${ethers.formatEther(balances[4])}</span>
            </div>
        `;
        
        document.getElementById('resultsContent').innerHTML = html;
        updateStatus('✅ تم جلب الأرصدة بنجاح', 'success');
        initializeIcons();
        
    } catch (error) {
        console.error('Balances error:', error);
        updateStatus('❌ خطأ في جلب الأرصدة: ' + error.message, 'error');
    }
}

// Check Arbitrage Opportunities
async function checkOpportunities() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        updateStatus('⏳ جاري فحص الفرص...', 'info');
        
        const opportunities = await contract.checkOpportunities();
        const tokens = opportunities[0];
        const profits = opportunities[1];
        
        if (tokens.length === 0) {
            document.getElementById('resultsContent').innerHTML = `
                <h3><i data-feather="search"></i> فحص الفرص</h3>
                <div class="stat-item">
                    <span>📊 الحالة:</span>
                    <span class="stat-value">لا توجد فرص متاحة حالياً</span>
                </div>
            `;
        } else {
            let html = `<h3><i data-feather="trending-up"></i> الفرص المتاحة (${tokens.length})</h3>`;
            
            for (let i = 0; i < tokens.length; i++) {
                html += `
                    <div class="stat-item">
                        <span>📈 العملة: ${formatAddress(tokens[i])}</span>
                        <span class="stat-value">ربح متوقع: ${ethers.formatUnits(profits[i], 6)} USDC</span>
                    </div>
                `;
            }
            
            document.getElementById('resultsContent').innerHTML = html;
        }
        
        updateStatus('✅ تم فحص الفرص بنجاح', 'success');
        initializeIcons();
        
    } catch (error) {
        console.error('Opportunities error:', error);
        updateStatus('❌ خطأ في فحص الفرص: ' + error.message, 'error');
    }
}

// Emergency Stop
async function emergencyStop() {
    try {
        if (!contract) {
            throw new Error('العقد غير متصل');
        }
        
        const confirmed = confirm('⚠️ هل أنت متأكد من إيقاف البوت؟ هذا الإجراء سيوقف جميع العمليات.');
        
        if (!confirmed) return;
        
        updateStatus('⏳ جاري إيقاف البوت...', 'info');
        
        const tx = await contract.emergencyPause();
        updateStatus('⏳ انتظار تأكيد المعاملة...', 'info');
        
        await tx.wait();
        
        updateStatus('✅ تم إيقاف البوت بنجاح', 'success');
        showNotification('🛑 تم إيقاف البوت', 'success');
        
    } catch (error) {
        console.error('Emergency stop error:', error);
        updateStatus('❌ خطأ في إيقاف البوت: ' + error.message, 'error');
    }
}

// Utility Functions
function updateStatus(message, type) {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = message;
    statusBar.className = `status-bar ${type}`;
    
    console.log(`Status: ${message}`);
}

function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function displayContractInfo(owner, isPaused) {
    const info = `
        <div class="stat-item">
            <span>👑 مالك العقد:</span>
            <span class="stat-value">${formatAddress(owner)}</span>
        </div>
        <div class="stat-item">
            <span>⏸️ حالة البوت:</span>
            <span class="stat-value">${isPaused ? '🔴 متوقف' : '🟢 يعمل'}</span>
        </div>
    `;
    
    document.getElementById('resultsContent').innerHTML = `
        <h3><i data-feather="info"></i> معلومات العقد</h3>
        ${info}
    `;
    
    initializeIcons();
}

function showNotification(message, type) {
    // إنشاء إشعار بسيط
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'error' ? 'background: #ff4757;' : 'background: #2ed573;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Handle MetaMask Account Changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            // User disconnected
            location.reload();
        } else {
            // User switched accounts
            if (isConnected) {
                location.reload();
            }
        }
    });
    
    window.ethereum.on('chainChanged', function (chainId) {
        // Reload on network change
        location.reload();
    });
}
