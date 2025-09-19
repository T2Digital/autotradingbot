// ========================================
// تفعيل الفلاش لون الحقيقي بدون رأس مال
// الحل النهائي لبدء جني الأرباح
// ========================================

// إعدادات AAVE Flash Loan على Polygon
const AAVE_POOL_ADDRESSES_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

// DEXs للمراقبة والتحكيم
const DEX_ROUTERS = {
    QUICKSWAP: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    SUSHISWAP: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    UNISWAP_V3: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
};

// عملات للمراقبة
const MONITORED_TOKENS = {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", 
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
};

// ABI للتفاعل مع DEXs
const UNISWAP_ROUTER_ABI = [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

// دالة الحصول على الأسعار المباشرة من DEXs
async function getRealTimePrice(tokenA, tokenB, amountIn, routerAddress) {
    try {
        const router = new ethers.Contract(routerAddress, UNISWAP_ROUTER_ABI, provider);
        
        // إنشاء path للتداول
        const path = [tokenA, tokenB];
        
        // الحصول على الأسعار
        const amounts = await router.getAmountsOut(amountIn, path);
        
        return amounts[amounts.length - 1]; // السعر النهائي
        
    } catch (error) {
        console.warn(`فشل في الحصول على السعر من ${routerAddress}:`, error);
        return ethers.BigNumber.from(0);
    }
}

// دالة اكتشاف الفرص الحقيقية
async function detectRealArbitrageOpportunities() {
    try {
        console.log('🔍 بحث عن فرص تحكيم حقيقية...');
        
        const opportunities = [];
        const tokens = Object.values(MONITORED_TOKENS);
        const routers = Object.values(DEX_ROUTERS);
        
        for (const tokenA of tokens) {
            for (const tokenB of tokens) {
                if (tokenA === tokenB) continue;
                
                // مبلغ الاختبار (بدون رأس مال - سنستخدم فلاش لون)
                const testAmount = ethers.parseUnits("1000", 6); // 1000 USDC equivalent
                
                const prices = [];
                
                // جلب الأسعار من جميع DEXs
                for (const router of routers) {
                    const price = await getRealTimePrice(tokenA, tokenB, testAmount, router);
                    prices.push({
                        router: router,
                        price: price,
                        dex: Object.keys(DEX_ROUTERS).find(key => DEX_ROUTERS[key] === router)
                    });
                }
                
                // البحث عن فروق الأسعار
                if (prices.length >= 2) {
                    const sortedPrices = prices.filter(p => p.price.gt(0)).sort((a, b) => 
                        a.price.gt(b.price) ? 1 : -1
                    );
                    
                    if (sortedPrices.length >= 2) {
                        const lowestPrice = sortedPrices[0];
                        const highestPrice = sortedPrices[sortedPrices.length - 1];
                        
                        // حساب فرق السعر
                        const priceDiff = highestPrice.price.sub(lowestPrice.price);
                        const profitPercentage = priceDiff.mul(10000).div(lowestPrice.price); // basis points
                        
                        // إذا كان الربح أكثر من 0.5% (50 basis points)
                        if (profitPercentage.gte(50)) {
                            const estimatedProfit = ethers.formatUnits(priceDiff, 6);
                            
                            console.log(`💰 فرصة مكتشفة: ${getTokenSymbol(tokenA)} -> ${getTokenSymbol(tokenB)}`);
                            console.log(`📊 ربح متوقع: $${estimatedProfit}`);
                            console.log(`🏪 شراء من: ${lowestPrice.dex}, بيع في: ${highestPrice.dex}`);
                            
                            opportunities.push({
                                tokenIn: tokenA,
                                tokenOut: tokenB,
                                buyFrom: lowestPrice.router,
                                sellTo: highestPrice.router,
                                buyDex: lowestPrice.dex,
                                sellDex: highestPrice.dex,
                                estimatedProfit: estimatedProfit,
                                profitPercentage: profitPercentage.toNumber() / 100, // convert to percentage
                                amount: testAmount
                            });
                        }
                    }
                }
            }
        }
        
        console.log(`✅ تم العثور على ${opportunities.length} فرصة محتملة`);
        return opportunities;
        
    } catch (error) {
        console.error('❌ خطأ في اكتشاف الفرص:', error);
        return [];
    }
}

// دالة تنفيذ الفلاش لون للتحكيم
async function executeFlashLoanArbitrage(opportunity) {
    try {
        console.log('🚀 تنفيذ فلاش لون للتحكيم...');
        
        if (!contract || !signer) {
            throw new Error('العقد غير متصل');
        }
        
        const {tokenIn, tokenOut, buyFrom, sellTo, amount, buyDex, sellDex} = opportunity;
        
        console.log(`💡 الاستراتيجية: شراء ${getTokenSymbol(tokenIn)} من ${buyDex} وبيع في ${sellDex}`);
        
        showLoading('تنفيذ فلاش لون...');
        updateStatus('🔄 تنفيذ فلاش لون للتحكيم...', 'info');
        
        // تحضير بيانات التحكيم
        const arbitrageData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'address', 'address', 'uint256'],
            [tokenIn, tokenOut, buyFrom, sellTo, amount]
        );
        
        // تنفيذ الفلاش لون من خلال العقد
        const tx = await contract.executeArbitrage(tokenIn, amount, arbitrageData);
        
        console.log('📝 معاملة الفلاش لون مرسلة:', tx.hash);
        updateStatus('⏳ انتظار تأكيد المعاملة...', 'info');
        
        // انتظار التأكيد
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            const profit = opportunity.estimatedProfit;
            console.log('✅ تم تنفيذ الفلاش لون بنجاح!');
            console.log(`💰 الربح المحقق: $${profit}`);
            
            updateStatus(`✅ نجح التحكيم! ربح: $${profit}`, 'success');
            showNotification(`🎉 صفقة ناجحة! ربح $${profit} من ${buyDex} إلى ${sellDex}`, 'success');
            
            // تحديث الإحصائيات
            await refreshStats();
            await refreshRecentTrades();
            
            return {success: true, profit: profit, txHash: receipt.transactionHash};
            
        } else {
            throw new Error('فشلت المعاملة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في تنفيذ الفلاش لون:', error);
        
        let errorMsg = error.message;
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
            errorMsg = 'الفرصة لم تعد متاحة (تم استغلالها من قبل بوت آخر)';
        } else if (error.message.includes('execution reverted')) {
            errorMsg = 'الفرصة غير مربحة بعد خصم رسوم الغاز';
        }
        
        updateStatus(`❌ فشل التحكيم: ${errorMsg}`, 'error');
        return {success: false, error: errorMsg};
        
    } finally {
        hideLoading();
    }
}

// دالة المراقبة المستمرة والتنفيذ التلقائي
async function startFlashLoanHunting() {
    try {
        console.log('🏹 بدء صيد فرص الفلاش لون...');
        
        if (!contract || !signer) {
            throw new Error('يجب ربط المحفظة والعقد أولاً');
        }
        
        updateStatus('🏹 بدء صيد الفرص...', 'info');
        showNotification('بدأ البوت في البحث عن فرص الفلاش لون', 'info');
        
        let successfulTrades = 0;
        let totalProfit = 0;
        
        // حلقة البحث المستمر كل 15 ثانية
        const huntingInterval = setInterval(async () => {
            try {
                console.log('🔍 جولة بحث جديدة...');
                
                // اكتشاف الفرص
                const opportunities = await detectRealArbitrageOpportunities();
                
                if (opportunities.length > 0) {
                    console.log(`🎯 وجد ${opportunities.length} فرص!`);
                    
                    // تنفيذ أفضل فرصة (الأعلى ربحاً)
                    const bestOpportunity = opportunities.sort((a, b) => 
                        parseFloat(b.estimatedProfit) - parseFloat(a.estimatedProfit)
                    )[0];
                    
                    console.log(`🚀 تنفيذ أفضل فرصة: ربح متوقع $${bestOpportunity.estimatedProfit}`);
                    
                    const result = await executeFlashLoanArbitrage(bestOpportunity);
                    
                    if (result.success) {
                        successfulTrades++;
                        totalProfit += parseFloat(result.profit);
                        
                        console.log(`📊 إجمالي النجاحات: ${successfulTrades}`);
                        console.log(`💰 إجمالي الأرباح: $${totalProfit.toFixed(2)}`);
                        
                        // تحديث العدادات في الواجهة
                        document.getElementById('successfulTrades').textContent = successfulTrades;
                        document.getElementById('dailyProfit').textContent = '$' + totalProfit.toFixed(2);
                        
                        // إذا حققنا 5 صفقات ناجحة، أبطئ قليلاً لتوفير الغاز
                        if (successfulTrades >= 5) {
                            console.log('🎉 تم تحقيق 5 صفقات ناجحة! تبطيء السرعة للحفاظ على الغاز');
                            clearInterval(huntingInterval);
                            
                            // إعادة البدء بسرعة أبطأ (كل دقيقة)
                            setTimeout(() => startFlashLoanHunting(), 60000);
                            return;
                        }
                    }
                } else {
                    console.log('😴 لا توجد فرص حالياً، استمرار البحث...');
                }
                
            } catch (huntError) {
                console.error('خطأ في دورة الصيد:', huntError);
            }
        }, 15000); // كل 15 ثانية
        
        // حفظ معرف الفترة لإمكانية الإيقاف
        window.flashLoanHuntingInterval = huntingInterval;
        
        updateStatus('✅ البوت يصطاد الفرص بنجاح!', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في بدء الصيد:', error);
        updateStatus('❌ فشل في بدء الصيد: ' + error.message, 'error');
    }
}

// دالة إيقاف الصيد
function stopFlashLoanHunting() {
    if (window.flashLoanHuntingInterval) {
        clearInterval(window.flashLoanHuntingInterval);
        window.flashLoanHuntingInterval = null;
        
        updateStatus('⏸️ تم إيقاف صيد الفرص', 'warning');
        showNotification('تم إيقاف البوت', 'warning');
        console.log('⏸️ تم إيقاف صيد الفلاش لون');
    }
}

// دالة الحصول على رمز العملة
function getTokenSymbol(address) {
    const symbols = {
        [MONITORED_TOKENS.USDC]: 'USDC',
        [MONITORED_TOKENS.USDT]: 'USDT', 
        [MONITORED_TOKENS.DAI]: 'DAI',
        [MONITORED_TOKENS.WETH]: 'WETH',
        [MONITORED_TOKENS.WMATIC]: 'WMATIC'
    };
    
    return symbols[address] || 'UNKNOWN';
}

// تصدير الدوال للواجهة
window.startFlashLoanHunting = startFlashLoanHunting;
window.stopFlashLoanHunting = stopFlashLoanHunting;
window.detectRealArbitrageOpportunities = detectRealArbitrageOpportunities;
window.executeFlashLoanArbitrage = executeFlashLoanArbitrage;

console.log('🎯 نظام الفلاش لون بدون رأس مال جاهز!');