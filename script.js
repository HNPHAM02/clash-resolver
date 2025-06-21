// Place the full JavaScript clash resolver logic here
// This will include processClash(), resolveClash(), and all relevant logic

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

// TODO: Add full implementation of processClash() and resolveClash() here
// You can paste your final validated clash logic JS here
