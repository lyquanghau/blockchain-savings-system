import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import {
  AUTO_RENEW_GRACE_PERIOD_DAYS,
  CONTRACTS,
  LOCAL_NETWORK,
  USDC_DECIMALS
} from "./config";
import { coreAbi, tokenAbi, vaultAbi } from "./abi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function ThreeLandingScene({ active, onToggle }) {
  const mountRef = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.1, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 5, 5);
    const rim = new THREE.PointLight(0x38bdf8, 4, 16);
    rim.position.set(-3, 2, 3);
    scene.add(ambient, key, rim);

    const coin = new THREE.Group();
    const coinBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.28, 1.28, 0.28, 96),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.72,
        roughness: 0.2,
        emissive: 0x075985,
        emissiveIntensity: 0.18
      })
    );
    coinBody.rotation.x = Math.PI / 2;
    const coinRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.34, 0.055, 18, 96),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.45, roughness: 0.18 })
    );
    coinRing.position.z = 0.16;
    const coinCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0.16 })
    );
    coinCore.position.z = 0.22;
    coinCore.rotation.z = Math.PI / 4;
    coin.add(coinBody, coinRing, coinCore);
    coin.position.set(0, 0.75, 0);
    group.add(coin);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.25, 2.65, 0.34, 96),
      new THREE.MeshStandardMaterial({
        color: 0xdff6ff,
        metalness: 0.2,
        roughness: 0.32,
        transparent: true,
        opacity: 0.82
      })
    );
    platform.position.set(0, -1.18, 0);
    group.add(platform);

    const columnMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.1 });
    [-0.9, 0, 0.9].forEach((x, index) => {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, index === 1 ? 1.14 : 0.92, 32), columnMaterial);
      column.position.set(x, -0.6 + (index === 1 ? 0.08 : 0), -0.12);
      group.add(column);
    });

    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      transparent: true,
      opacity: 0.86
    });
    const clouds = [];
    function makeCloud(x, y, z, scale) {
      const cloud = new THREE.Group();
      [0, 0.42, -0.42, 0.82].forEach((offset, index) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.32 : 0.25, 24, 18), cloudMaterial);
        puff.position.set(offset, index === 1 ? 0.12 : 0, 0);
        cloud.add(puff);
      });
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      scene.add(cloud);
      clouds.push(cloud);
    }
    makeCloud(-2.8, 1.8, -0.4, 0.82);
    makeCloud(2.35, 1.22, -0.2, 0.68);
    makeCloud(-2.1, -0.25, 0.2, 0.54);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.9 })
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    function resize() {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }
    function onPointerMove(event) {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    mount.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", resize);
    resize();

    let frameId = 0;
    const clock = new THREE.Clock();
    function animate() {
      const elapsed = clock.getElapsedTime();
      group.rotation.y += (pointer.x * 0.22 - group.rotation.y) * 0.04;
      group.rotation.x += (pointer.y * 0.12 - group.rotation.x) * 0.04;
      coin.rotation.y += activeRef.current ? 0.075 : 0.018;
      coin.rotation.x = Math.sin(elapsed * 1.4) * 0.12;
      coin.position.y = 0.75 + Math.sin(elapsed * 1.8) * 0.16;
      clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(elapsed * (0.35 + index * 0.05)) * 0.003;
        cloud.position.y += Math.cos(elapsed * (0.55 + index * 0.08)) * 0.002;
      });
      particles.rotation.y = elapsed * 0.035;
      particles.rotation.x = Math.sin(elapsed * 0.3) * 0.05;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    renderer.domElement.addEventListener("click", onToggle);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener("click", onToggle);
      mount.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      particleGeometry.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onToggle]);

  return <div className="three-scene" ref={mountRef} />;
}

function formatAmount(value) {
  return Number(formatUnits(value || 0n, USDC_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function shortAddress(value) {
  if (!value) return "Not connected";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusLabel(status) {
  if (status === 0n || status === 0) return "Active";
  if (status === 1n || status === 1) return "Withdrawn";
  if (status === 2n || status === 2) return "Manual Renewed";
  if (status === 3n || status === 3) return "Auto Renewed";
  return "Unknown";
}

function normalizeAddress(value) {
  return (value || "").toLowerCase();
}

function getAccountRole(account) {
  const normalized = normalizeAddress(account);
  if (!normalized) return "Guest";
  return "Client";
}

function getActionHint({
  paused,
  isActive,
  isMatured,
  canAutoRenew,
  canUseContracts,
  account,
  planEnabled,
  hasMockUsdcBalance
}) {
  if (!canUseContracts || !account) return "Connect MetaMask first.";
  if (paused) return "System activity is paused by the operator.";
  if (planEnabled === false) return "Selected plan is disabled.";
  if (!hasMockUsdcBalance) return "This wallet has no available stablecoin balance for deposits.";
  if (!isActive) return "Deposit is already closed.";
  if (isMatured === false) return "This action requires maturity.";
  if (isMatured === true && canAutoRenew === false) return "Action available before grace window ends.";
  return "Ready";
}

function getNetworkLabel(chainId, network) {
  if (!chainId) return "Not connected";
  if (String(chainId) === String(LOCAL_NETWORK.chainId)) return "Supported Network";
  return network || `Chain ${chainId}`;
}

function formatWalletError(error) {
  if (error?.code === 4001) {
    return "MetaMask request was rejected. Open the extension and approve the connection request.";
  }
  if (error?.code === -32002) {
    return "A MetaMask connection request is already pending. Open the MetaMask extension and complete it first.";
  }
  if (error?.code === 4100) {
    return "This site is not authorized in MetaMask. Reconnect the wallet from the extension.";
  }
  if (error?.code === 4902) {
    return "The selected network is missing in MetaMask. Add the required network manually in wallet settings.";
  }
  return error?.shortMessage || error?.reason || error?.message || "MetaMask connection failed.";
}

function getProgressPercent(startAt, maturityAt, nowSeconds = Date.now() / 1000) {
  const total = Math.max(Number(maturityAt - startAt), 1);
  const elapsed = Math.min(Math.max(nowSeconds - Number(startAt), 0), total);
  return Math.round((elapsed / total) * 100);
}

function getTxTone(message) {
  const text = (message || "").toLowerCase();
  if (!text || text === "ready.") return "neutral";
  if (text.includes("succeeded") || text.includes("completed successfully")) return "success";
  if (text.includes("failed") || text.includes("rejected") || text.includes("locked")) return "danger";
  if (text.includes("pending") || text.includes("requesting") || text.includes("...")) return "pending";
  return "neutral";
}

function formatDateTime(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000).toLocaleString();
}

function getActionTitle(action) {
  if (action === "settle") return "Confirm settlement";
  if (action === "earlyExit") return "Confirm early exit";
  if (action === "manualRenew") return "Confirm manual renew";
  if (action === "autoRenew") return "Confirm auto renew";
  return "Confirm action";
}

function getActionSummary(action, deposit, selectedPlanId) {
  if (action === "settle") {
    return `User will receive ${formatAmount(deposit.principal)} USDC principal from SavingCore and ${formatAmount(deposit.expectedInterest)} USDC interest from VaultManager.`;
  }

  if (action === "earlyExit") {
    const penalty = (deposit.principal * deposit.penaltyBpsAtOpen) / 10_000n;
    const returned = deposit.principal - penalty;
    return `User will receive ${formatAmount(returned)} USDC. Penalty: ${formatAmount(penalty)} USDC. Interest payout: 0 USDC.`;
  }

  if (action === "manualRenew") {
    const newPrincipal = deposit.principal + deposit.expectedInterest;
    return `This will close the current deposit and create a new one using plan #${selectedPlanId}. New principal: ${formatAmount(newPrincipal)} USDC.`;
  }

  if (action === "autoRenew") {
    const newPrincipal = deposit.principal + deposit.expectedInterest;
    return `This will auto-renew using the original APR snapshot and tenor. New principal: ${formatAmount(newPrincipal)} USDC.`;
  }

  return "";
}

function formatContractError(error, context = {}) {
  const rawMessage = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.info?.error?.message,
    error?.data?.message
  ]
    .filter(Boolean)
    .join(" ");

  if (rawMessage.includes("AmountBelowMinimum")) {
    const minDeposit = context.minDeposit ? `${formatAmount(context.minDeposit)} USDC` : "the minimum";
    return `Deposit amount is below the minimum required for this plan. Minimum deposit: ${minDeposit}.`;
  }

  if (rawMessage.includes("AmountAboveMaximum")) {
    const maxDeposit = context.maxDeposit ? `${formatAmount(context.maxDeposit)} USDC` : "the maximum";
    return `Deposit amount is above the maximum allowed for this plan. Maximum deposit: ${maxDeposit}.`;
  }

  if (rawMessage.includes("PlanDisabled")) {
    return "This saving plan is currently disabled.";
  }

  if (rawMessage.includes("VaultInsufficient")) {
    return "The vault does not have enough reserved liquidity to accept this deposit yet.";
  }

  if (rawMessage.includes("SystemPaused")) {
    return "The system is paused. Try again after the operator resumes service.";
  }

  if (error?.code === 4001) {
    return "The wallet request was rejected in MetaMask.";
  }

  return error?.shortMessage || error?.reason || error?.message || "The transaction failed.";
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState("");
  const [chainId, setChainId] = useState("");
  const [paused, setPaused] = useState(false);
  const [vaultBalance, setVaultBalance] = useState("0");
  const [walletTokenBalance, setWalletTokenBalance] = useState("0");
  const [plans, setPlans] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("1");
  const [depositAmount, setDepositAmount] = useState("1000");
  const [vaultAmount, setVaultAmount] = useState("5000");
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState("500");
  const [feeReceiverAddress, setFeeReceiverAddress] = useState("");
  const [planAdminForm, setPlanAdminForm] = useState({
    planId: "1",
    newAprBps: "1200"
  });
  const [planForm, setPlanForm] = useState({
    tenorDays: "30",
    aprBps: "1200",
    minDeposit: "100",
    maxDeposit: "5000",
    penaltyBps: "500"
  });
  const [message, setMessage] = useState("");
  const [hasMetaMask, setHasMetaMask] = useState(Boolean(window.ethereum));
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, plans, portfolio, admin
  const [sceneActive, setSceneActive] = useState(false);
  const [sceneStyle, setSceneStyle] = useState({ "--rx": "0deg", "--ry": "0deg" });
  const [adminOpen, setAdminOpen] = useState(false);
  const [popup, setPopup] = useState({ open: false, title: "", body: "" });
  const [walletDisconnectOpen, setWalletDisconnectOpen] = useState(false);
  const [chainNowMs, setChainNowMs] = useState(Date.now());
  const [confirmAction, setConfirmAction] = useState(null);
  const [coreOwner, setCoreOwner] = useState("");
  const [vaultOwner, setVaultOwner] = useState("");
  const [currentFeeReceiver, setCurrentFeeReceiver] = useState("");

  const canUseContracts =
    account &&
    CONTRACTS.core !== ZERO_ADDRESS &&
    CONTRACTS.vault !== ZERO_ADDRESS &&
    CONTRACTS.token !== ZERO_ADDRESS;
  const currentRole = getAccountRole(account);
  const selectedPlan = plans.find((plan) => plan.planId.toString() === selectedPlanId);
  const onExpectedNetwork = chainId === String(LOCAL_NETWORK.chainId);
  const isAdmin =
    normalizeAddress(account) !== "" &&
    (normalizeAddress(account) === normalizeAddress(coreOwner) ||
      normalizeAddress(account) === normalizeAddress(vaultOwner));
  const hasMockUsdcBalance = Number(walletTokenBalance.replace(/,/g, "")) > 0;
  const activeDeposits = deposits.filter((deposit) => statusLabel(deposit.status) === "Active");
  const totalPrincipal = activeDeposits.reduce((sum, deposit) => sum + deposit.principal, 0n);
  const totalInterest = activeDeposits.reduce((sum, deposit) => sum + deposit.expectedInterest, 0n);
  const txTone = getTxTone(message);

  function handleSceneMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setSceneStyle({
      "--rx": `${(-y * 10).toFixed(2)}deg`,
      "--ry": `${(x * 12).toFixed(2)}deg`
    });
  }

  function resetSceneMove() {
    setSceneStyle({ "--rx": "0deg", "--ry": "0deg" });
  }

  const toggleScene = useCallback(() => {
    setSceneActive((current) => !current);
  }, []);

  function renderMarketTable() {
    if (plans.length === 0) {
      return <p className="empty-state">No earn products are available yet.</p>;
    }

    return (
      <table className="market-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>APR</th>
            <th>Term</th>
            <th>Limits</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.planId.toString()}>
              <td>
                <div className="asset-cell">
                  <div className="asset-icon">U</div>
                  <div>
                    <strong>mUSDC Fixed Savings</strong>
                    <div className="mono" style={{ color: "var(--muted)", fontSize: "12px" }}>
                      Plan #{plan.planId.toString()}
                    </div>
                  </div>
                </div>
              </td>
              <td><span className="apy">{(Number(plan.aprBps) / 100).toFixed(2)}%</span></td>
              <td>{plan.tenorDays.toString()} days</td>
              <td>
                {formatAmount(plan.minDeposit)} - {plan.maxDeposit === 0n ? "Unlimited" : formatAmount(plan.maxDeposit)} USDC
              </td>
              <td>
                <span className={plan.enabled ? "badge-active" : "badge-disabled"}>
                  {plan.enabled ? "Open" : "Disabled"}
                </span>
              </td>
              <td>
                <button
                  className="secondary"
                  onClick={() => {
                    setSelectedPlanId(plan.planId.toString());
                    setActiveTab("plans");
                  }}
                  disabled={!plan.enabled}
                >
                  Subscribe
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderLanding() {
    return (
      <main
        className={`landing-screen ${sceneActive ? "scene-active" : ""}`}
        style={sceneStyle}
        onMouseMove={handleSceneMove}
        onMouseLeave={resetSceneMove}
      >
        <div className="landing-copy">
          <span className="hero-kicker">Nebula Earn Protocol</span>
          <h1>Banking enters the Web3 sky.</h1>
          <p>
            A fixed-yield savings experience with on-chain certificates, transparent vault
            reserves, and a product interface built for modern digital banking.
          </p>
          <div className="landing-actions">
          <button className="primary landing-start" onClick={() => setHasEnteredApp(true)}>
              Start Banking
            </button>
            <button className="secondary" onClick={toggleScene}>
              Toggle 3D Coin
            </button>
          </div>
        </div>

        <div className="landing-stage">
          <ThreeLandingScene active={sceneActive} onToggle={toggleScene} />
        </div>

        <div className="landing-orbit orbit-one"></div>
        <div className="landing-orbit orbit-two"></div>
      </main>
    );
  }

  function renderDashboard() {
    const bestPlan = plans.reduce((best, plan) => {
      if (!best || Number(plan.aprBps) > Number(best.aprBps)) return plan;
      return best;
    }, null);

    return (
      <>
        <section className="product-hero product-hero-compact">
          <div>
            <span className="hero-kicker">Web3 Savings Bank</span>
            <h3>Fixed Yield Savings for On-chain Stablecoins</h3>
            <p>
              Lock mUSDC into transparent term products, receive an NFT position certificate,
              and settle principal plus interest directly from smart contracts.
            </p>
            <div className="hero-metrics">
              <div className="hero-metric">
                <span>Best APR</span>
                <strong>{bestPlan ? `${(Number(bestPlan.aprBps) / 100).toFixed(2)}%` : "0.00%"}</strong>
              </div>
              <div className="hero-metric">
                <span>Products</span>
                <strong>{plans.length}</strong>
              </div>
              <div className="hero-metric">
                <span>System</span>
                <strong>{paused ? "Paused" : "Live"}</strong>
              </div>
            </div>
          </div>
          <div className="trade-ticket">
            <h4>Quick Subscribe</h4>
            <div className="form-group">
              <label>Plan</label>
              <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                {plans.map((plan) => (
                  <option key={plan.planId.toString()} value={plan.planId.toString()}>
                    {plan.tenorDays.toString()} days - {(Number(plan.aprBps) / 100).toFixed(2)}% APR
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
              />
            </div>
            <button
              className="primary"
              style={{ width: "100%" }}
              onClick={handleOpenDeposit}
              disabled={!selectedPlan || !selectedPlan.enabled || !onExpectedNetwork || paused}
            >
              Subscribe
            </button>
          </div>
        </section>

        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-label">Portfolio Principal</span>
            <div className="stat-value">{formatAmount(totalPrincipal)} USDC</div>
            <div className="stat-footer">Across {activeDeposits.length} certificates</div>
          </article>
          <article className="stat-card">
            <span className="stat-label">Accrued Interest</span>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              {formatAmount(totalInterest)} USDC
            </div>
            <div className="stat-footer">Expected upon maturity</div>
          </article>
          <article className="stat-card">
            <span className="stat-label">Vault Reserve</span>
            <div className="stat-value">{vaultBalance} USDC</div>
            <div className="stat-footer">{paused ? "System Paused" : "Liquidity Available"}</div>
          </article>
          <article className="stat-card">
            <span className="stat-label">Wallet Balance</span>
            <div className="stat-value">{walletTokenBalance} USDC</div>
            <div className="stat-footer">{onExpectedNetwork ? "Connected" : "Wrong Network"}</div>
          </article>
        </div>

        <section className="market-panel">
          <div className="section-header">
            <div>
              <h3>Earn Markets</h3>
              <p>Live fixed-term products available from the protocol.</p>
            </div>
          </div>
          {renderMarketTable()}
        </section>
      </>
    );
  }

  function renderPortfolio() {
    return (
      <>
        <div className="section-header">
          <h3>Your Savings Portfolio</h3>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Track your certificates and settle them upon maturity.
          </p>
        </div>

        {deposits.length === 0 && <p className="empty-state">No deposits found for this wallet.</p>}

        <div className="deposit-list">
          {deposits.map((deposit) => {
            const depositId = deposit.depositId.toString();
            const isActive = statusLabel(deposit.status) === "Active";
            const maturityTimeMs = Number(deposit.maturityAt) * 1000;
            const autoRenewTimeMs = maturityTimeMs + AUTO_RENEW_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
            const isMatured = maturityTimeMs <= chainNowMs;
            const canAutoRenew = autoRenewTimeMs <= chainNowMs;
            const progress = getProgressPercent(deposit.startAt, deposit.maturityAt, chainNowMs / 1000);
            
            return (
              <article key={depositId} className="deposit-item">
                <div className="deposit-info">
                  <div className="mono" style={{ fontSize: "12px", color: "var(--brand)", fontWeight: "600", marginBottom: "4px" }}>
                    NFT CERTIFICATE #{depositId}
                  </div>
                  <h5>Plan #{deposit.planId.toString()}</h5>
                  <p>{formatAmount(deposit.principal)} USDC Principal</p>
                </div>

                <div className="progress-container">
                  <div className="progress-labels">
                    <span>Maturity: {new Date(maturityTimeMs).toLocaleDateString()}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-inner" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="deposit-status">
                  <span className={`deposit-status ${isActive ? (isMatured ? "status-matured" : "status-active") : "status-closed"}`}>
                    {isActive ? (isMatured ? "MATURED" : "ACTIVE") : statusLabel(deposit.status).toUpperCase()}
                  </span>
                </div>

                <div className="deposit-actions">
                  <button 
                    className="secondary" 
                    onClick={() => openConfirmAction("settle", deposit)}
                    disabled={!canUseContracts || !onExpectedNetwork || paused || !isActive || !isMatured}
                  >
                    Settle
                  </button>
                  <button 
                    className="secondary"
                    onClick={() => openConfirmAction("earlyExit", deposit)}
                    disabled={!canUseContracts || !onExpectedNetwork || paused || !isActive || isMatured}
                  >
                    Early Exit
                  </button>
                  {isMatured && (
                    <button 
                      className="primary"
                      onClick={() => openConfirmAction("manualRenew", deposit)}
                      disabled={!canUseContracts || !onExpectedNetwork || paused || !isActive}
                    >
                      Renew
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  }

  function renderAdmin() {
    return (
      <div className="admin-grid">
        <div className="admin-section">
          <h3>Create Savings Plan</h3>
          <p className="plan-desc">Define parameters for a new investment product.</p>
          <div className="form-group">
            <label>Tenor (Days)</label>
            <input value={planForm.tenorDays} onChange={(e) => setPlanForm({ ...planForm, tenorDays: e.target.value })} />
          </div>
          <div className="form-group">
            <label>APR (Basis Points, e.g. 1200 = 12%)</label>
            <input value={planForm.aprBps} onChange={(e) => setPlanForm({ ...planForm, aprBps: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Min Deposit (USDC)</label>
            <input value={planForm.minDeposit} onChange={(e) => setPlanForm({ ...planForm, minDeposit: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Max Deposit (USDC, 0 for unlimited)</label>
            <input value={planForm.maxDeposit} onChange={(e) => setPlanForm({ ...planForm, maxDeposit: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Early Withdrawal Penalty (Basis Points)</label>
            <input value={planForm.penaltyBps} onChange={(e) => setPlanForm({ ...planForm, penaltyBps: e.target.value })} />
          </div>
          <button className="primary" style={{ width: "100%" }} onClick={handleCreatePlan} disabled={!canUseContracts || !onExpectedNetwork}>
            Deploy New Plan
          </button>
        </div>

        <div className="admin-section">
          <h3>Vault Management</h3>
          <p className="plan-desc">Manage the interest reserve liquidity.</p>
          <div className="stat-card" style={{ marginBottom: "20px", background: "#f8fafc" }}>
            <span className="stat-label">Available Vault Balance</span>
            <div className="stat-value" style={{ fontSize: "20px" }}>{vaultBalance} USDC</div>
          </div>
          <div className="form-group">
            <label>Fund Amount (USDC)</label>
            <input value={vaultAmount} onChange={(e) => setVaultAmount(e.target.value)} />
          </div>
          <button className="secondary" style={{ width: "100%", marginBottom: "16px" }} onClick={handleFundVault} disabled={!canUseContracts || !onExpectedNetwork}>
            Fund Vault
          </button>
          <div className="form-group">
            <label>Withdraw Amount (USDC)</label>
            <input value={vaultWithdrawAmount} onChange={(e) => setVaultWithdrawAmount(e.target.value)} />
          </div>
          <button className="secondary" style={{ width: "100%" }} onClick={handleWithdrawVault} disabled={!canUseContracts || !onExpectedNetwork}>
            Withdraw Free Liquidity
          </button>
          
          <div className="admin-actions-inline" style={{ marginTop: "24px" }}>
            <button className={paused ? "primary" : "secondary"} style={{ flex: 1 }} onClick={() => handlePause(!paused)}>
              {paused ? "Resume System" : "Pause System"}
            </button>
          </div>
        </div>

        <div className="admin-section">
          <h3>Protocol Configuration</h3>
          <div className="form-group">
            <label>Current Fee Receiver</label>
            <div className="mono" style={{ fontSize: "12px", background: "#f8fafc", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
              {currentFeeReceiver}
            </div>
            <label>New Fee Receiver Address</label>
            <input value={feeReceiverAddress} onChange={(e) => setFeeReceiverAddress(e.target.value)} />
          </div>
          <button className="secondary" style={{ width: "100%" }} onClick={handleSetFeeReceiver} disabled={!canUseContracts || !onExpectedNetwork || !feeReceiverAddress}>
            Update Fee Receiver
          </button>

          <h4 style={{ marginTop: "32px", marginBottom: "12px" }}>Active Plans</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {plans.map(plan => (
              <div key={plan.planId.toString()} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                <span className="mono">Plan #{plan.planId.toString()}</span>
                <button className="secondary" style={{ padding: "4px 12px", fontSize: "12px" }} onClick={() => handleTogglePlan(plan.planId, plan.enabled)}>
                  {plan.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPlans() {
    return (
      <>
        <div className="section-header">
          <div>
            <h3>Earn Products</h3>
            <p>Choose a fixed term and subscribe with your wallet balance.</p>
          </div>
          <button className="secondary" onClick={() => refreshData()} disabled={!canUseContracts}>
            Refresh
          </button>
        </div>

        <div className="plans-grid">
          {plans.length === 0 && <p className="empty-state">No plans are available yet.</p>}
          {plans.map((plan) => {
            const isSelected = plan.planId.toString() === selectedPlanId;
            return (
              <article key={plan.planId.toString()} className={`plan-card ${isSelected ? "plan-card-selected" : ""}`}>
                <div>
                  <span className={plan.enabled ? "badge-active" : "badge-disabled"}>
                    {plan.enabled ? "Open for subscription" : "Disabled"}
                  </span>
                  <h4>mUSDC Fixed Savings - {plan.tenorDays.toString()} Days</h4>
                  <p className="plan-desc">
                    Fixed APR is snapshotted at subscription time. Principal stays in SavingCore,
                    while interest is paid from the protocol vault at maturity.
                  </p>
                  <div className="plan-metrics">
                    <div className="metric-item">
                      <span>APR</span>
                      <strong className="apy">{(Number(plan.aprBps) / 100).toFixed(2)}%</strong>
                    </div>
                    <div className="metric-item">
                      <span>Term</span>
                      <strong>{plan.tenorDays.toString()} days</strong>
                    </div>
                    <div className="metric-item">
                      <span>Early exit fee</span>
                      <strong>{(Number(plan.earlyWithdrawPenaltyBps) / 100).toFixed(2)}%</strong>
                    </div>
                    <div className="metric-item">
                      <span>Limits</span>
                      <strong>
                        {formatAmount(plan.minDeposit)} - {plan.maxDeposit === 0n ? "Unlimited" : formatAmount(plan.maxDeposit)} USDC
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="trade-ticket">
                  <h4>{isSelected ? "Subscription ticket" : "Select product"}</h4>
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      value={isSelected ? depositAmount : ""}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="1000"
                      disabled={!isSelected}
                    />
                  </div>
                  <button
                    className={isSelected ? "primary" : "secondary"}
                    style={{ width: "100%" }}
                    onClick={() => {
                      if (isSelected) {
                        handleOpenDeposit();
                      } else {
                        setSelectedPlanId(plan.planId.toString());
                      }
                    }}
                    disabled={!plan.enabled || !onExpectedNetwork || paused}
                  >
                    {isSelected ? "Subscribe Now" : "Select Product"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  }

  function resetWalletState() {
    setAccount("");
    setSigner(null);
    setProvider(null);
    setNetwork("");
    setChainId("");
    setWalletTokenBalance("0");
    setDeposits([]);
  }

  function showPopup(title, body) {
    setPopup({ open: true, title, body });
  }

  function closePopup() {
    setPopup({ open: false, title: "", body: "" });
  }

  function closeConfirmAction() {
    setConfirmAction(null);
  }

  function openWalletDisconnectConfirm() {
    setWalletDisconnectOpen(true);
  }

  function closeWalletDisconnectConfirm() {
    setWalletDisconnectOpen(false);
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setHasMetaMask(false);
      setMessage("MetaMask is not installed. Install the extension, then refresh this page.");
      return;
    }

    try {
      setHasMetaMask(true);

      if (window.ethereum.isMetaMask !== true) {
        setMessage("An injected wallet was found, but it does not identify itself as MetaMask.");
      }

      if (window.ethereum._metamask?.isUnlocked) {
        const unlocked = await window.ethereum._metamask.isUnlocked();
        if (!unlocked) {
          setMessage("MetaMask is locked. Unlock the extension, then try connecting again.");
          return;
        }
      }

      const existingAccounts = await window.ethereum.request({ method: "eth_accounts" });
      if (existingAccounts.length === 0) {
        setMessage("Awaiting wallet approval...");
      }

      const nextProvider = new BrowserProvider(window.ethereum);
      await nextProvider.send("eth_requestAccounts", []);
      const nextSigner = await nextProvider.getSigner();
      const nextNetwork = await nextProvider.getNetwork();
      const nextAccount = await nextSigner.getAddress();

      setProvider(nextProvider);
      setSigner(nextSigner);
      setAccount(nextAccount);
      setNetwork(`${nextNetwork.name} (${nextNetwork.chainId})`);
      setChainId(nextNetwork.chainId.toString());

      if (Number(nextNetwork.chainId) !== LOCAL_NETWORK.chainId) {
        setMessage(
          `Wallet connected, but the selected network is unsupported. Switch to chain ${LOCAL_NETWORK.chainId}.`
        );
        return;
      }

      setMessage("Wallet connected successfully.");
    } catch (error) {
      setMessage(formatWalletError(error));
    }
  }

  async function disconnectWallet() {
    closeWalletDisconnectConfirm();
    resetWalletState();
    setMessage(
      "Wallet session cleared in this app. Remove this site in MetaMask if you want a full disconnect."
    );
  }

  function handleWalletButtonClick() {
    if (account) {
      openWalletDisconnectConfirm();
      return;
    }

    connectWallet();
  }

  async function refreshData(activeSigner = signer, activeAccount = account) {
    if (
      !activeSigner ||
      !activeAccount ||
      CONTRACTS.core === ZERO_ADDRESS ||
      CONTRACTS.vault === ZERO_ADDRESS
    ) {
      return;
    }

    const core = new Contract(CONTRACTS.core, coreAbi, activeSigner);
    const vault = new Contract(CONTRACTS.vault, vaultAbi, activeSigner);
    const token = new Contract(CONTRACTS.token, tokenAbi, activeSigner);
    const latestBlock = await activeSigner.provider.getBlock("latest");

    const [nextPlanId, ids, rawPaused, rawVaultBalance, rawWalletTokenBalance] = await Promise.all([
      core.nextPlanId(),
      core.getDepositIdsByOwner(activeAccount),
      vault.paused(),
      vault.availableVaultBalance(),
      token.balanceOf(activeAccount)
    ]);

    const [rawCoreOwner, rawVaultOwner, rawFeeReceiver] = await Promise.all([
      core.owner(),
      vault.owner(),
      vault.feeReceiver()
    ]);

    const planPromises = [];
    for (let planId = 1n; planId < nextPlanId; planId += 1n) {
      planPromises.push(core.getPlan(planId));
    }

    const [nextPlans, nextDeposits] = await Promise.all([
      Promise.all(planPromises),
      Promise.all(ids.map((id) => core.getDeposit(id)))
    ]);

    setPlans(nextPlans);
    setDeposits(nextDeposits);
    setPaused(rawPaused);
    setVaultBalance(formatAmount(rawVaultBalance));
    setWalletTokenBalance(formatAmount(rawWalletTokenBalance));
    setCoreOwner(rawCoreOwner);
    setVaultOwner(rawVaultOwner);
    setCurrentFeeReceiver(rawFeeReceiver);
    if (!feeReceiverAddress) {
      setFeeReceiverAddress(rawFeeReceiver);
    }
    if (latestBlock?.timestamp) {
      setChainNowMs(Number(latestBlock.timestamp) * 1000);
    }

    if (nextPlans.length && !nextPlans.find((plan) => plan.planId.toString() === selectedPlanId)) {
      setSelectedPlanId(nextPlans[0].planId.toString());
    }
    if (nextPlans.length && !nextPlans.find((plan) => plan.planId.toString() === planAdminForm.planId)) {
      setPlanAdminForm((current) => ({ ...current, planId: nextPlans[0].planId.toString() }));
    }
  }

  async function runTx(label, fn, options = {}) {
    try {
      setMessage(`${label}...`);
      const tx = await fn();
      await tx.wait();
      setMessage(`${label} succeeded.`);
      await refreshData();
    } catch (error) {
      const nextMessage = formatContractError(error, options.errorContext);
      setMessage(nextMessage);
      showPopup(options.errorTitle || `${label} failed`, nextMessage);
    }
  }

  async function handleOpenDeposit() {
    const parsedAmount = Number(depositAmount || "0");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showPopup("Invalid deposit amount", "Enter a valid deposit amount greater than zero.");
      return;
    }

    if (selectedPlan) {
      if (selectedPlan.minDeposit > 0n) {
        const minDeposit = Number(formatUnits(selectedPlan.minDeposit, USDC_DECIMALS));
        if (parsedAmount < minDeposit) {
          const nextMessage = `Deposit amount is below the minimum required for this plan. Minimum deposit: ${formatAmount(selectedPlan.minDeposit)} USDC.`;
          setMessage(nextMessage);
          showPopup("Deposit below minimum", nextMessage);
          return;
        }
      }

      if (selectedPlan.maxDeposit > 0n) {
        const maxDeposit = Number(formatUnits(selectedPlan.maxDeposit, USDC_DECIMALS));
        if (parsedAmount > maxDeposit) {
          const nextMessage = `Deposit amount is above the maximum allowed for this plan. Maximum deposit: ${formatAmount(selectedPlan.maxDeposit)} USDC.`;
          setMessage(nextMessage);
          showPopup("Deposit above maximum", nextMessage);
          return;
        }
      }
    }

    const token = new Contract(CONTRACTS.token, tokenAbi, signer);
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    const amount = parseUnits(depositAmount || "0", USDC_DECIMALS);

    await runTx("Approve token", () => token.approve(CONTRACTS.core, amount));
    await runTx("Open deposit", () => core.openDeposit(BigInt(selectedPlanId), amount), {
      errorTitle: "Open deposit failed",
      errorContext: selectedPlan
        ? {
            minDeposit: selectedPlan.minDeposit,
            maxDeposit: selectedPlan.maxDeposit
          }
        : {}
    });
  }

  async function handleWithdrawAtMaturity(depositId) {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`Withdraw deposit #${depositId} at maturity`, () =>
      core.withdrawAtMaturity(depositId)
    );
  }

  async function handleEarlyWithdraw(depositId) {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`Early withdraw deposit #${depositId}`, () => core.earlyWithdraw(depositId));
  }

  async function handleRenew(depositId, newPlanId) {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`Renew deposit #${depositId}`, () =>
      core.renewDeposit(depositId, BigInt(newPlanId))
    );
  }

  async function handleAutoRenew(depositId) {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`Auto renew deposit #${depositId}`, () => core.autoRenewDeposit(depositId));
  }

  function openConfirmAction(action, deposit) {
    setConfirmAction({
      action,
      deposit
    });
  }

  async function executeConfirmedAction() {
    if (!confirmAction) {
      return;
    }

    const { action, deposit } = confirmAction;
    closeConfirmAction();

    if (action === "settle") {
      await handleWithdrawAtMaturity(deposit.depositId);
      return;
    }

    if (action === "earlyExit") {
      await handleEarlyWithdraw(deposit.depositId);
      return;
    }

    if (action === "manualRenew") {
      await handleRenew(deposit.depositId, selectedPlanId);
      return;
    }

    if (action === "autoRenew") {
      await handleAutoRenew(deposit.depositId);
    }
  }

  async function handleCreatePlan() {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx("Create plan", () =>
      core.createPlan(
        BigInt(planForm.tenorDays),
        BigInt(planForm.aprBps),
        parseUnits(planForm.minDeposit || "0", USDC_DECIMALS),
        parseUnits(planForm.maxDeposit || "0", USDC_DECIMALS),
        BigInt(planForm.penaltyBps)
      )
    );
  }

  async function handleFundVault() {
    const token = new Contract(CONTRACTS.token, tokenAbi, signer);
    const vault = new Contract(CONTRACTS.vault, vaultAbi, signer);
    const amount = parseUnits(vaultAmount || "0", USDC_DECIMALS);

    await runTx("Approve vault funding", () => token.approve(CONTRACTS.vault, amount));
    await runTx("Fund vault", () => vault.fundVault(amount));
  }

  async function handleWithdrawVault() {
    const vault = new Contract(CONTRACTS.vault, vaultAbi, signer);
    const amount = parseUnits(vaultWithdrawAmount || "0", USDC_DECIMALS);
    await runTx("Withdraw vault liquidity", () => vault.withdrawVault(amount), {
      errorTitle: "Vault withdrawal failed"
    });
  }

  async function handleSetFeeReceiver() {
    const vault = new Contract(CONTRACTS.vault, vaultAbi, signer);
    await runTx("Set fee receiver", () => vault.setFeeReceiver(feeReceiverAddress), {
      errorTitle: "Set fee receiver failed"
    });
  }

  async function handleUpdatePlan() {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`Update plan #${planAdminForm.planId} APR`, () =>
      core.updatePlan(BigInt(planAdminForm.planId), BigInt(planAdminForm.newAprBps))
    );
  }

  async function handleTogglePlan(planId, enabled) {
    const core = new Contract(CONTRACTS.core, coreAbi, signer);
    await runTx(`${enabled ? "Disable" : "Enable"} plan #${planId}`, () =>
      enabled ? core.disablePlan(planId) : core.enablePlan(planId)
    );
  }

  async function handlePause(nextPaused) {
    const vault = new Contract(CONTRACTS.vault, vaultAbi, signer);
    await runTx(nextPaused ? "Pause system" : "Resume system", () =>
      nextPaused ? vault.pause() : vault.unpause()
    );
  }

  useEffect(() => {
    if (signer && canUseContracts) {
      refreshData();
    }
  }, [signer, account, canUseContracts]);

  useEffect(() => {
    if (!signer || !canUseContracts) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshData();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [signer, account, canUseContracts]);

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    function handleAccountsChanged(nextAccounts) {
      if (!nextAccounts.length) {
        resetWalletState();
        setMessage("Wallet disconnected.");
        return;
      }
      connectWallet();
    }

    function handleChainChanged(nextChainId) {
      setChainId(parseInt(nextChainId, 16).toString());
      connectWallet();
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    !hasEnteredApp ? renderLanding() :
    <div className="app-container">
      {/* Modals & Popups */}
      {confirmAction && (
        <div className="modal-overlay" onClick={closeConfirmAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="confirm-action-title">{getActionTitle(confirmAction.action)}</h3>
              <button className="secondary" onClick={closeConfirmAction}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="confirm-grid">
                <div>
                  <span>Certificate</span>
                  <strong className="mono">#{confirmAction.deposit.depositId.toString()}</strong>
                </div>
                <div>
                  <span>Plan</span>
                  <strong className="mono">#{confirmAction.deposit.planId.toString()}</strong>
                </div>
                <div>
                  <span>Principal</span>
                  <strong className="mono">{formatAmount(confirmAction.deposit.principal)} USDC</strong>
                </div>
                <div>
                  <span>Interest</span>
                  <strong className="mono">{formatAmount(confirmAction.deposit.expectedInterest)} USDC</strong>
                </div>
                <div>
                  <span>Maturity</span>
                  <strong>{formatDateTime(confirmAction.deposit.maturityAt)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{statusLabel(confirmAction.deposit.status)}</strong>
                </div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6" }}>
                {getActionSummary(confirmAction.action, confirmAction.deposit, selectedPlanId)}
              </p>
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={closeConfirmAction}>Cancel</button>
              <button className="primary" onClick={executeConfirmedAction}>Confirm Action</button>
            </div>
          </div>
        </div>
      )}

      {popup.open && (
        <div className="modal-overlay" onClick={closePopup}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{popup.title}</h3>
              <button className="secondary" onClick={closePopup}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--muted)", lineHeight: "1.6" }}>{popup.body}</p>
            </div>
            <div className="modal-footer">
              <button className="primary" onClick={closePopup}>Understood</button>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand-mark">N</div>
          <div>
            <h1>Nebula Earn</h1>
            <span>Fixed yield protocol</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-dot"></span>
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === "plans" ? "active" : ""}`}
            onClick={() => setActiveTab("plans")}
          >
            <span className="nav-dot"></span>
            <span>Earn</span>
          </button>
          <button
            className={`nav-item ${activeTab === "portfolio" ? "active" : ""}`}
            onClick={() => setActiveTab("portfolio")}
          >
            <span className="nav-dot"></span>
            <span>Portfolio</span>
          </button>
          {isAdmin && (
            <button
              className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              <span className="nav-dot"></span>
              <span>Operations</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className="secondary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleWalletButtonClick}
          >
            {account ? "Disconnect" : "Connect Wallet"}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h2>{activeTab === "dashboard" ? "Overview" : activeTab === "plans" ? "Earn" : activeTab === "admin" ? "Operations" : "Portfolio"}</h2>
            <p>{paused ? "Protocol is paused" : "Protocol is accepting eligible transactions"}</p>
          </div>
          <div className="header-actions">
            <div className={`network-badge ${onExpectedNetwork ? "ok" : "warn"}`}>
              {getNetworkLabel(chainId, network)}
            </div>
            {account && (
              <div className="wallet-badge">
                <span className="mono">{shortAddress(account)}</span>
                <span>{isAdmin ? "Operator" : "Client"}</span>
              </div>
            )}
          </div>
        </header>

        {message && (
          <div className={`status-banner banner-${txTone}`}>
            {message}
          </div>
        )}
        <div className="view-container">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "plans" && renderPlans()}
          {activeTab === "portfolio" && renderPortfolio()}
          {activeTab === "admin" && isAdmin && renderAdmin()}
        </div>
      </main>
    </div>
  );
}
