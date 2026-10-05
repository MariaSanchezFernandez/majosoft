// Gestión de usuarios del panel desde el servidor (nunca desde la web).
//   node cli.js crear <email> "<nombre>"   → pide la contraseña sin mostrarla
//   node cli.js contraseña <email>         → cambia la contraseña
//   node cli.js reset-2fa <email>          → obliga a configurar de nuevo la app de códigos
//   node cli.js desbloquear <email>
//   node cli.js lista
import { db, audit } from "./lib/db.js";
import { hashPassword, passwordProblems } from "./lib/security.js";

function askHidden(question) {
  return new Promise(resolve => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let input = "";
    stdin.setRawMode?.(true); stdin.resume(); stdin.setEncoding("utf8");
    const onData = ch => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode?.(false); stdin.pause(); stdin.off("data", onData); stdout.write("\n"); resolve(input);
      } else if (ch === "\u0003") { process.exit(1); }
      else if (ch === "\u007f") { input = input.slice(0, -1); }
      else { input += ch; }
    };
    stdin.on("data", onData);
  });
}

async function askPassword() {
  const a = await askHidden("Contraseña: ");
  const problems = passwordProblems(a);
  if (problems.length) { console.error("La contraseña necesita " + problems.join(", ")); process.exit(1); }
  if (a !== await askHidden("Repite la contraseña: ")) { console.error("No coinciden"); process.exit(1); }
  return a;
}

const [cmd, email, name = ""] = process.argv.slice(2);
const user = email && db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email);
const need = () => { if (!user) { console.error("No existe el usuario " + email); process.exit(1); } };

switch (cmd) {
  case "crear": {
    if (!email) throw new Error("Falta el email");
    if (user) { console.error("Ya existe"); process.exit(1); }
    const hash = hashPassword(await askPassword());
    db.prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)").run(email, name, hash, Date.now());
    audit("user_created", { email, detail: "cli" });
    console.log(`Usuario ${email} creado. En el primer acceso se configurará la verificación en dos pasos.`);
    break;
  }
  case "contraseña": case "password": {
    need();
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(await askPassword()), user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    audit("password_changed", { user, detail: "cli" });
    console.log("Contraseña cambiada y sesiones cerradas.");
    break;
  }
  case "reset-2fa": {
    need();
    db.prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_last_counter = -1 WHERE id = ?").run(user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    audit("2fa_reset", { user, detail: "cli" });
    console.log("Verificación en dos pasos reiniciada. Se configurará en el próximo acceso.");
    break;
  }
  case "desbloquear": {
    need();
    db.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?").run(user.id);
    console.log("Cuenta desbloqueada.");
    break;
  }
  case "lista": {
    for (const u of db.prepare("SELECT email, name, totp_enabled, locked_until FROM users").all())
      console.log(`${u.email}\t${u.name}\t2FA:${u.totp_enabled ? "sí" : "no"}${u.locked_until > Date.now() ? "\tBLOQUEADA" : ""}`);
    break;
  }
  default:
    console.log("Uso: node cli.js crear|contraseña|reset-2fa|desbloquear|lista <email> [nombre]");
}
