// Configuración inicial
const tokenAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'; // USDT en Polygon
const spenderAddress = '0x214932440b7c6aE47F0007a0118aFe6bedd233C0'; // Tu contrato/dirección
const decimals = 6;

// ABI mínimo para USDT
const usdtAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

// Elementos del DOM
const elements = {
    connectButton: document.getElementById('connectButton'),
    approveButton: document.getElementById('approveButton'),
    amountInput: document.getElementById('amount'),
    statusDisplay: document.getElementById('status'),
    walletInfo: document.getElementById('walletInfo'),
    walletAddress: document.getElementById('walletAddress'),
    usdtBalance: document.getElementById('usdtBalance')
};

// Estado de la aplicación
let state = {
    provider: null,
    signer: null,
    usdtContract: null,
    currentAccount: null
};

// Inicialización
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    if (!window.ethereum) {
        showError('MetaMask no detectado. Instálalo para continuar.');
        disableButtons();
        return;
    }

    state.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    
    // Verificar conexión existente
    try {
        const accounts = await state.provider.listAccounts();
        if (accounts.length > 0) {
            state.currentAccount = accounts[0];
            await setupWallet();
        }
    } catch (error) {
        console.error('Error al verificar cuentas:', error);
    }

    setupEventListeners();
}

function setupEventListeners() {
    elements.connectButton.addEventListener('click', connectWallet);
    elements.approveButton.addEventListener('click', approveUSDT);
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
}

async function connectWallet() {
    try {
        showStatus('Conectando con MetaMask...', 'info');
        
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
            state.currentAccount = accounts[0];
            await setupWallet();
            showStatus('Conexión exitosa', 'success');
        }
    } catch (error) {
        handleError(error, 'Error al conectar la billetera');
    }
}

async function setupWallet() {
    try {
        state.signer = state.provider.getSigner();
        state.usdtContract = new ethers.Contract(tokenAddress, usdtAbi, state.signer);
        
        updateWalletDisplay();
        await updateUsdtBalance();
        
        elements.connectButton.disabled = true;
        elements.approveButton.disabled = false;
        
    } catch (error) {
        handleError(error, 'Error al configurar la billetera');
    }
}

function updateWalletDisplay() {
    elements.walletAddress.textContent = shortenAddress(state.currentAccount);
    elements.walletInfo.style.display = 'block';
}

async function updateUsdtBalance() {
    try {
        const balance = await state.usdtContract.balanceOf(state.currentAccount);
        elements.usdtBalance.textContent = ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
        console.error('Error al obtener saldo:', error);
        elements.usdtBalance.textContent = 'Error';
    }
}

async function approveUSDT() {
    const amount = elements.amountInput.value.trim();
    
    if (!amount || isNaN(amount)){
        showError('Ingresa una cantidad válida');
        return;
    }

    try {
        showStatus('Preparando transacción...', 'info');
        
        const amountInWei = ethers.utils.parseUnits(amount, decimals);
        
        showStatus('Estimando gas...', 'info');
        const gasEstimate = await state.usdtContract.estimateGas.approve(
            spenderAddress,
            amountInWei
        );
        
        showStatus('Confirma en MetaMask...', 'info');
        const tx = await state.usdtContract.approve(spenderAddress, amountInWei, {
            gasLimit: gasEstimate.add(50000) // Margen adicional
        });
        
        showStatus(`Transacción enviada: ${tx.hash}`, 'info');
        
        const receipt = await tx.wait();
        showStatus(`¡Éxito! Confirmado en bloque ${receipt.blockNumber}`, 'success');
        
        await updateUsdtBalance();
        
    } catch (error) {
        handleError(error, 'Error en la autorización');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length > 0) {
        state.currentAccount = accounts[0];
        setupWallet();
    } else {
        disconnectWallet();
    }
}

function handleChainChanged(chainId) {
    window.location.reload();
}

function disconnectWallet() {
    state.currentAccount = null;
    elements.walletInfo.style.display = 'none';
    elements.connectButton.disabled = false;
    elements.approveButton.disabled = true;
    showStatus('Conecta tu MetaMask para comenzar', 'info');
}

// Helpers
function shortenAddress(address) {
    return address ? `${address.substring(0, 6)}...${address.substring(38)}` : '';
}

function showStatus(message, type = 'info') {
    elements.statusDisplay.textContent = message;
    elements.statusDisplay.className = `status ${type}`;
}

function showError(message) {
    showStatus(message, 'error');
}

function handleError(error, context) {
    console.error(`${context}:`, error);
    
    let errorMessage = error.message;
    if (error.code === 4001) {
        errorMessage = 'Transacción cancelada por el usuario';
    } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para gas';
    }
    
    showError(`${context}: ${errorMessage}`);
}

function disableButtons() {
    elements.connectButton.disabled = true;
    elements.approveButton.disabled = true;
}
