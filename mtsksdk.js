// Configuración inicial
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

let provider;
let signer;
let usdtContract;

// ABI mínimo para USDT
const usdtAbi = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ethereum === 'undefined') {
        statusDisplay.textContent = 'MetaMask no está instalado. Por favor instálalo para continuar.';
        statusDisplay.className = 'error';
        return;
    }
    
    provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Verificar si ya está conectado
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
        await setupWallet(accounts[0]);
    }
});

// Conectar MetaMask
connectButton.addEventListener('click', async () => {
    try {
        statusDisplay.textContent = 'Conectando con MetaMask...';
        statusDisplay.className = 'info';
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            await setupWallet(accounts[0]);
        }
    } catch (error) {
        console.error('Error al conectar:', error);
        statusDisplay.textContent = `Error al conectar: ${error.message}`;
        statusDisplay.className = 'error';
    }
});

// Configurar wallet después de la conexión
async function setupWallet(address) {
    try {
        signer = provider.getSigner();
        usdtContract = new ethers.Contract(tokenAddress, usdtAbi, signer);
        
        // Mostrar información de la wallet
        walletAddress.textContent = address;
        walletInfo.style.display = 'block';
        
        // Actualizar saldo de USDT
        await updateUsdtBalance(address);
        
        // Habilitar botón de aprobación
        approveButton.disabled = false;
        connectButton.disabled = true;
        
        statusDisplay.textContent = 'MetaMask conectado correctamente.';
        statusDisplay.className = 'success';
        
        // Escuchar cambios de cuenta
        window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length > 0) {
                setupWallet(newAccounts[0]);
            } else {
                walletInfo.style.display = 'none';
                approveButton.disabled = true;
                connectButton.disabled = false;
                statusDisplay.textContent = 'Por favor, conecta tu billetera MetaMask.';
                statusDisplay.className = 'info';
            }
        });
        
    } catch (error) {
        console.error('Error al configurar wallet:', error);
        statusDisplay.textContent = `Error al configurar wallet: ${error.message}`;
        statusDisplay.className = 'error';
    }
}

// Actualizar saldo de USDT
async function updateUsdtBalance(address) {
    try {
        const balance = await usdtContract.balanceOf(address);
        usdtBalance.textContent = ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
        console.error('Error al obtener saldo USDT:', error);
        usdtBalance.textContent = 'Error';
    }
}

// Aprobar USDT
approveButton.addEventListener('click', async () => {
    const amountToApprove = amountInput.value;
    
    if (!amountToApprove || isNaN(amountToApprove) {
        statusDisplay.textContent = 'Por favor ingresa una cantidad válida de USDT.';
        statusDisplay.className = 'error';
        return;
    }
    
    try {
        statusDisplay.textContent = 'Preparando transacción...';
        statusDisplay.className = 'info';
        
        const amountInWei = ethers.utils.parseUnits(amountToApprove, decimals);
        
        // Estimar gas
        const gasEstimate = await usdtContract.estimateGas.approve(spenderAddress, amountInWei);
        
        statusDisplay.textContent = 'Confirmando en MetaMask...';
        
        // Enviar transacción
        const tx = await usdtContract.approve(spenderAddress, amountInWei, {
            gasLimit: gasEstimate.mul(120).div(100) // Añadir 20% de margen
        });
        
        statusDisplay.textContent = `Transacción enviada. Esperando confirmación... (Hash: ${tx.hash})`;
        statusDisplay.className = 'info';
        
        // Esperar confirmación
        const receipt = await tx.wait();
        
        statusDisplay.textContent = `¡Aprobación exitosa! Transacción confirmada en bloque ${receipt.blockNumber}`;
        statusDisplay.className = 'success';
        
        // Actualizar saldo (opcional)
        await updateUsdtBalance(await signer.getAddress());
        
    } catch (error) {
        console.error('Error en la aprobación:', error);
        
        if (error.code === 4001) {
            statusDisplay.textContent = 'Transacción cancelada por el usuario.';
        } else {
            statusDisplay.textContent = `Error en la aprobación: ${error.message}`;
        }
        
        statusDisplay.className = 'error';
    }
});
