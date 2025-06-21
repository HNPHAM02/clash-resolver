function addDice(containerId) {
  const container = document.getElementById(containerId);
  const div = document.createElement("div");
  div.className = "dice-entry";
  div.innerHTML = `
    Power: <input type="number" class="power" value="1" style="width: 60px">
    Type:
    <select class="type" onchange="updateSubtype(this)">
      <option value="Offensive">Offensive</option>
      <option value="Block">Block</option>
      <option value="Evade">Evade</option>
    </select>
    <span class="subtype-container">
      <select class="subtype">
        <option value="Slash">Slash</option>
        <option value="Pierce">Pierce</option>
        <option value="Blunt">Blunt</option>
      </select>
    </span>
    Counter: <input type="checkbox" class="counter">
    <button onclick="this.parentElement.remove()">🗑️ Remove</button>
  `;
  container.appendChild(div);
}

function updateSubtype(selectElement) {
  const container = selectElement.parentElement;
  const subtypeContainer = container.querySelector(".subtype-container");
  subtypeContainer.style.display = (selectElement.value === "Offensive") ? "inline" : "none";
}

function collectDice(containerId) {
  const container = document.getElementById(containerId);
  const dice = [];
  container.querySelectorAll(".dice-entry").forEach(entry => {
    const power = parseInt(entry.querySelector(".power").value);
    const type = entry.querySelector(".type").value;
    const subtype = entry.querySelector(".subtype")?.value || null;
    const counter = entry.querySelector(".counter").checked;
    dice.push({ power, type, subtype, counter });
  });
  return dice;
}

function submitForm() {
  const affinities = {
    Slash: {
      health: parseInt(document.getElementById("aff_slash_health").value),
      stagger: parseInt(document.getElementById("aff_slash_stagger").value),
    },
    Pierce: {
      health: parseInt(document.getElementById("aff_pierce_health").value),
      stagger: parseInt(document.getElementById("aff_pierce_stagger").value),
    },
    Blunt: {
      health: parseInt(document.getElementById("aff_blunt_health").value),
      stagger: parseInt(document.getElementById("aff_blunt_stagger").value),
    }
  };

  const userHP = parseInt(document.getElementById("userHP").value);
  const userStagger = parseInt(document.getElementById("userStagger").value);

  const userDice = collectDice("userDiceContainer");
  const targetDice = collectDice("targetDiceContainer");
  const bonus = {
    damage: parseInt(document.getElementById("bonusDamage").value),
    stagger: parseInt(document.getElementById("bonusStagger").value)
  };

  const payload = { userDice, targetDice, bonus, affinities, userHP, userStagger };
  const result = processClash(payload);

  const resultHtml = `
    <h3>Clash Result</h3>
    <strong>Health Lost:</strong> ${result.healthToQ5}<br>
    <strong>Stagger Lost:</strong> ${result.staggerToQ8}<br>
    <strong>Final Health:</strong> ${result.finalHealth}<br>
    <strong>Final Stagger:</strong> ${result.finalStagger}<br>
    <strong>Target Damaged:</strong> ${result.targetHealth} Health / ${result.targetStagger} Stagger<br><br>
    <h4>Clash Log:</h4>
    <ul>${result.log.map(line => `<li>${line}</li>`).join("")}</ul>
  `;
  document.getElementById("result").innerHTML = resultHtml;
}

function processClash(payload) {
  const { userDice, targetDice, bonus, affinities, userHP, userStagger } = payload;
  const result = {
    healthToQ5: 0,
    staggerToQ8: 0,
    targetHealth: 0,
    targetStagger: 0,
    finalHealth: userHP,
    finalStagger: userStagger,
    log: []
  };

  let uIndex = 0, tIndex = 0;
  let userQueue = [...userDice];
  let targetQueue = [...targetDice];

  while (uIndex < userQueue.length || tIndex < targetQueue.length) {
    const user = userQueue[uIndex] || null;
    const target = targetQueue[tIndex] || null;

    if (!user && target) {
      if (target.type === "Offensive") {
        const aff = affinities[target.subtype];
        const dmg = target.power + aff.health;
        const stg = target.power + aff.stagger;
        result.healthToQ5 += dmg;
        result.staggerToQ8 += stg;
        result.log.push(`[Unopposed] Target Offensive ${target.subtype} deals ${dmg} Health / ${stg} Stagger.`);
      } else if (target.type === "Block") {
        result.log.push(`[Unopposed] Target Block is saved.`);
      } else if (target.type === "Evade") {
        result.log.push(`[Unopposed] Target Evade is saved.`);
      }
      tIndex++;
      continue;
    }

    if (user && !target) {
      if (user.type === "Block") {
        result.log.push(`[Unopposed] User Block is saved.`);
      } else if (user.type === "Evade") {
        result.log.push(`[Unopposed] User Evade is saved.`);
      } else if (user.type === "Offensive") {
        const subtype = user.subtype || "Slash";
        const aff = affinities[subtype];
        const totalDamage = user.power + (bonus?.damage || 0);
        const totalStagger = user.power;
        result.targetHealth += totalDamage;
        result.targetStagger += totalStagger;
        result.log.push(`[Unopposed] User Offensive ${subtype} deals ${totalDamage} Health / ${totalStagger} Stagger.`);
      }
      uIndex++;
      continue;
    }

    const outcome = resolveClash(user, target, affinities, bonus);
    result.healthToQ5 += outcome.health;
    result.staggerToQ8 += outcome.stagger;
    result.targetHealth += outcome.targetHealth;
    result.targetStagger += outcome.targetStagger;
    result.log.push(outcome.description);

    if (!outcome.userPersists) uIndex++;
    if (!outcome.targetPersists) tIndex++;
  }

  result.finalHealth = Math.max(0, userHP - result.healthToQ5);
  result.finalStagger = Math.max(0, userStagger - result.staggerToQ8);
  return result;
}

function resolveClash(u, t, affinities, bonus) {
  const aff = affinities[t.subtype || "Slash"] || { health: 0, stagger: 0 };
  const result = {
    health: 0,
    stagger: 0,
    targetHealth: 0,
    targetStagger: 0,
    userPersists: false,
    targetPersists: false,
    description: ""
  };

  const diff = u.power - t.power;
  const oppDiff = t.power - u.power;
  const bonusDmg = bonus?.damage || 0;
  const bonusStg = bonus?.stagger || 0;
  const log = [];

  if (u.type === "Offensive" && t.type === "Offensive") {
    if (diff > 0) {
      result.targetHealth = u.power + bonusDmg;
      result.targetStagger = u.power;
      if (u.counter) result.userPersists = true;
      log.push(`User wins Offensive vs Offensive. Deals ${result.targetHealth} Health / ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.health = t.power + aff.health;
      result.stagger = t.power + aff.stagger;
      if (t.counter) result.targetPersists = true;
      log.push(`Target wins Offensive vs Offensive. Deals ${result.health} Health / ${result.stagger} Stagger.`);
    } else log.push(`Tie: Offensive vs Offensive. No effect.`);
  }

  else if (u.type === "Block" && t.type === "Offensive") {
    if (diff > 0) {
      result.targetStagger = diff + bonusStg;
      if (u.counter) result.userPersists = true;
      log.push(`User Block wins. Target takes ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.health = oppDiff + aff.health;
      result.stagger = oppDiff + aff.stagger;
      if (t.counter) result.targetPersists = true;
      log.push(`Target Offensive wins. User takes ${result.health}/${result.stagger}.`);
    } else log.push(`Tie: Block vs Offensive. No effect.`);
  }

  else if (u.type === "Offensive" && t.type === "Block") {
    if (diff > 0) {
      result.targetHealth = diff + bonusDmg;
      result.targetStagger = diff;
      if (u.counter) result.userPersists = true;
      log.push(`User Offensive hits through Block. Deals ${result.targetHealth} Health / ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.stagger = -diff;
      if (t.counter) result.targetPersists = true;
      log.push(`Target Block wins. User takes ${result.stagger} Stagger.`);
    } else log.push(`Tie: Offensive vs Block. No effect.`);
  }

  else if (u.type === "Evade" && t.type === "Offensive") {
    if (diff > 0) {
      result.userPersists = true;
      log.push(`User Evade wins. Avoids and reuses.`);
    } else if (diff < 0) {
      result.health = t.power + aff.health;
      result.stagger = Math.max(0, oppDiff + aff.stagger);
      log.push(`Evade fails. Takes ${result.health}/${result.stagger}.`);
    } else log.push(`Tie: Evade vs Offensive. No effect.`);
  }

  else if (u.type === "Offensive" && t.type === "Evade") {
    if (diff > 0) {
      result.targetHealth = u.power + bonusDmg;
      result.targetStagger = Math.max(0, u.power - t.power);
      if (u.counter) result.userPersists = true;
      log.push(`User Offensive hits Evade. Deals ${result.targetHealth} Health / ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.targetStagger = -(t.power - u.power);
      log.push(`Target Evade wins. Regains ${-result.targetStagger} Stagger.`);
    } else log.push(`Tie: Offensive vs Evade. No effect.`);
  }

  else if (u.type === "Block" && t.type === "Evade") {
    if (diff > 0) {
      result.targetStagger = diff + bonusStg;
      log.push(`Block wins vs Evade. Target takes ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.targetStagger = -(oppDiff);
      log.push(`Evade wins vs Block. Recovers ${-result.targetStagger} Stagger.`);
    } else log.push(`Tie: Block vs Evade. No effect.`);
  }

  else if (u.type === "Evade" && t.type === "Block") {
    if (diff > 0) {
      result.stagger = -(diff);
      log.push(`Evade wins vs Block. User recovers ${-result.stagger} Stagger.`);
    } else if (diff < 0) {
      result.targetStagger = oppDiff;
      log.push(`Block wins vs Evade. User takes ${result.targetStagger} Stagger.`);
    } else log.push(`Tie: Evade vs Block. No effect.`);
  }

  else if (u.type === "Evade" && t.type === "Evade") {
    if (diff > 0) {
      result.stagger = -(diff);
      log.push(`Evade vs Evade. User recovers ${-result.stagger} Stagger.`);
    } else if (diff < 0) {
      result.targetStagger = -(oppDiff);
      log.push(`Evade vs Evade. Target recovers ${-result.targetStagger} Stagger.`);
    } else log.push(`Tie: Evade vs Evade. No effect.`);
  }

  else if (u.type === "Block" && t.type === "Block") {
    if (diff > 0) {
      result.targetStagger = diff;
      log.push(`Block vs Block. Target takes ${result.targetStagger} Stagger.`);
    } else if (diff < 0) {
      result.stagger = oppDiff;
      log.push(`Block vs Block. User takes ${result.stagger} Stagger.`);
    } else log.push(`Tie: Block vs Block. No effect.`);
  }

  result.description = log.join(" ");
  return result;
}
