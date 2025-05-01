const approveButton = document.getElementById('approveButton');
const statusDisplay = document.getElementById('status');
const amountInput = document.getElementById('amount');
const tokenAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const spenderAddress = '0x214932440b7c6aE47F0007a0118aFe6bedd233C0';
const decimals = 6;
let ethereum;
let metamaskSDK;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.MetaMaskSDK) { // Verifica si MetaMaskSDK ya está en window
            metamaskSDK = new window.MetaMaskSDK();
            ethereum = metamaskSDK.getProvider();

            if (!ethereum) {
                statusDisplay.textContent = 'MetaMask no está instalado.';
                approveButton.disabled = true;
                return;
            }

            try {
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    console.log('MetaMask conectado con la cuenta:', accounts[0]);
                } else {
                    statusDisplay.textContent = 'Por favor, conecta tu billetera MetaMask.';
                }
            } catch (error) {
                console.error('Error al conectar con MetaMask:', error);
                statusDisplay.textContent = 'Error al conectar con MetaMask.';
            }

        } else {
            statusDisplay.textContent = 'Error: El SDK de MetaMask no se cargó correctamente.';
            approveButton.disabled = true;
        }
    } catch (error) {
        console.error('Error al inicializar MetaMask SDK:', error);
        statusDisplay.textContent = `Error al inicializar MetaMask SDK: ${error.message}`;
        approveButton.disabled = true;
    }

    amountInput.addEventListener('focus', () => {
        statusDisplay.textContent = '';
        statusDisplay.className = '';
    });
});

approveButton.addEventListener('click', async () => {
    if (!ethereum) {
        statusDisplay.textContent = 'MetaMask no está instalado.';
        return;
    }

    const amountToApproveUSDT = amountInput.value;
    if (!amountToApproveUSDT || isNaN(amountToApproveUSDT) || parseFloat(amountToApproveUSDT) <= 0) {
        statusDisplay.textContent = 'Por favor, ingresa una cantidad válida de USDT.';
        statusDisplay.className = 'error';
        return;
    }

    const amountToApproveWei = ethers.utils.parseUnits(amountToApproveUSDT, decimals).toHexString();
    statusDisplay.textContent = 'Solicitando aprobación...';
    statusDisplay.className = '';

    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
            statusDisplay.textContent = 'No se pudo conectar con la billetera.';
            statusDisplay.className = 'error';
            return;
        }
        const userAddress = accounts[0];

        const approveParams = {
            from: userAddress,
            to: tokenAddress,
            data: '0x095ea7b3' + // approve(address,uint256) function signature
                  ethereum.utils.padLeft(spenderAddress.toLowerCase().substring(2), 64) +
                  ethereum.utils.padLeft(amountToApproveWei.substring(2), 64),
        };

        const txHash = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [approveParams],
        });

        statusDisplay.textContent = `Aprobación enviada. Hash de transacción: ${txHash}`;
        statusDisplay.className = 'success';
        // Opcional: Puedes redirigir al usuario a tu página de compra después de la aprobación exitosa.
        // window.location.href = '/tu-pagina-de-compra';

    } catch (error) {
        console.error('Error al aprobar USDT:', error);
        statusDisplay.textContent = `Error al aprobar USDT: ${error.message}`;
        statusDisplay.className = 'error';
    }
});
