// Elementos del DOM
const approveButton = document.getElementById('approveButton');
const connectButton = document.getElementById('connectButton');
const statusDisplay = document.getElementById('status');
const amountInput = document.getElementById('amount');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const usdtBalance = document.getElementById('usdtBalance');

// Configuración de contratos (Polygon Mainnet)
const tokenAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'; // USDT en Polygon
const spenderAddress = '0x214932440b7c6aE47F0007a0118aFe6bedd233C0'; // Tu contrato o dirección
const decimals = 6;

// ABI mínimo para USDT
const usdtAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

// Variables globales
let provider;
let signer;
let usdtContract;
let currentAccount = null;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ethereum === 'undefined') {
        showError('MetaMask no está instalado. Por favor instálalo para continuar.');
        connectButton.disabled = true;
        return;
    }

    // Configurar el proveedor Ethers
    provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    
    // Verificar si ya está conectado
    try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            await setupWallet();
        }
    } catch (error) {
        console.error('Error al verificar cuentas:', error);
    }

    // Configurar listeners de eventos
    setupEventListeners();
});

// Configurar listeners de eventos
function setupEventListeners() {
    // Conectar MetaMask
    connectButton.addEventListener('click', async () => {
        try {
            showStatus('Conectando con MetaMask...', 'info');
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                await setupWallet();
            }
        } catch (error) {
            showError(`Error al conectar: ${error.message}`);
        }
    });

    // Aprobar USDT
    approveButton.addEventListener('click', async () => {
        if (!currentAccount) {
            showError('Por favor conecta tu billetera primero');
            return;
        }

        const amountToApprove = amountInput.value.trim();
        
        if (!amountToApprove || isNaN(amountToApprove) || parseFloat(amountToApprove) <= 0) {
            showError('Por favor ingresa una cantidad válida de USDT');
            return;
        }

        try {
            showStatus('Preparando transacción...', 'info');
            
            const amountInWei = ethers.utils.parseUnits(amountToApprove, decimals);
            
            // Estimar gas
            showStatus('Estimando gas...', 'info');
            const gasEstimate = await usdtContract.estimateGas.approve(spenderAddress, amountInWei);
            
            // Enviar transacción
            showStatus('Confirmando en MetaMask...', 'info');
            const tx = await usdtContract.approve(spenderAddress, amountInWei, {
                gasLimit: gasEstimate.add(100000) // Margen adicional
            });
            
            showStatus(`Transacción enviada. Esperando confirmación... (Hash: ${tx.hash})`, 'info');
            
            // Esperar confirmación
            const receipt = await tx.wait();
            
            showStatus(`¡Aprobación exitosa! Transacción confirmada en bloque ${receipt.blockNumber}`, 'success');
            
            // Actualizar saldo
            await updateUsdtBalance();
            
        } catch (error) {
            handleTransactionError(error);
        }
    });

    // Escuchar cambios de cuenta
    window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
            currentAccount = newAccounts[0];
            setupWallet();
        } else {
            disconnectWallet();
        }
    });

    // Escuchar cambios de red
    window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload(); // Recargar para manejar el cambio de red
    });
}

// Configurar wallet después de la conexión
async function setupWallet() {
    try {
        signer = provider.getSigner();
        usdtContract = new ethers.Contract(tokenAddress, usdtAbi, signer);
        
        // Mostrar información de la wallet
        walletAddress.textContent = shortenAddress(currentAccount);
        walletInfo.style.display = 'block';
        
        // Actualizar saldos
        await updateUsdtBalance();
        
        // Actualizar UI
        connectButton.disabled = true;
        approveButton.disabled = false;
        
        showStatus('MetaMask conectado correctamente', 'success');
        
    } catch (error) {
        showError(`Error al configurar wallet: ${error.message}`);
    }
}

// Desconectar wallet
function disconnectWallet() {
    currentAccount = null;
    walletInfo.style.display = 'none';
    connectButton.disabled = false;
    approveButton.disabled = true;
    showStatus('Por favor, conecta tu billetera MetaMask', 'info');
}

// Actualizar saldo de USDT
async function updateUsdtBalance() {
    try {
        const balance = await usdtContract.balanceOf(currentAccount);
        usdtBalance.textContent = ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
        console.error('Error al obtener saldo USDT:', error);
        usdtBalance.textContent = 'Error';
    }
}

// Manejar errores de transacción
function handleTransactionError(error) {
    console.error('Error en la transacción:', error);
    
    if (error.code === 4001) {
        showError('Transacción cancelada por el usuario');
    } else if (error.message.includes('insufficient funds')) {
        showError('Fondos insuficientes para gas');
    } else {
        showError(`Error en la transacción: ${error.message}`);
    }
}

// Helper para mostrar direcciones acortadas
function shortenAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Helpers para mostrar estados
function showStatus(message, type = 'info') {
    statusDisplay.textContent = message;
    statusDisplay.className = type;
}

function showError(message) {
    showStatus(message, 'error');
}

function showSuccess(message) {
    showStatus(message, 'success');
}
