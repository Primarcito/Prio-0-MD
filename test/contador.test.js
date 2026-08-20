const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config');
const { buildContadorContent } = require('../utils/contador');
const { canManageCountdown } = require('../permissions');

test('muestra dias, horas y minutos con Markdown de Discord', () => {
  const now = config.CONTADOR_TARGET_MS - (
    (10 * 24 * 60 * 60 * 1000) +
    (14 * 60 * 60 * 1000) +
    (22 * 60 * 1000) +
    (35 * 1000)
  );

  assert.equal(
    buildContadorContent(now),
    '# 10 : 14 : 22\n' +
      '## TIEMPO PARA SER LIBRES\n' +
      '-# DÍAS · HORAS · MINUTOS\n' +
      '-# Liberación: <t:1788170400:F>'
  );
});

test('reemplaza el contador al llegar a cero', () => {
  const finalContent = '# 🐘 SOMOS LIBRES 🐘\n## EL CONTENIDO HA CAMBIADO';
  assert.equal(buildContadorContent(config.CONTADOR_TARGET_MS), finalContent);
  assert.equal(buildContadorContent(config.CONTADOR_TARGET_MS + 60000), finalContent);
});

test('solo autoriza al usuario configurado', () => {
  assert.equal(canManageCountdown({ id: '852823068475785217' }), true);
  assert.equal(canManageCountdown({ id: 'otro-usuario' }), false);
});
