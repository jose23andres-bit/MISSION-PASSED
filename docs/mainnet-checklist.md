# Mainnet launch gate

Esta lista no autoriza ninguna transacción. Cada punto requiere evidencia y aprobación humana.

- [ ] Nombre, símbolo y marca revisados legalmente.
- [ ] Suministro, decimales y distribución aprobados.
- [ ] Wallets de tesorería y equipo creadas con custodia adecuada.
- [ ] Multisig configurada y recuperaciones ensayadas, si aplica.
- [ ] Ensayo Devnet creado, verificado y documentado.
- [ ] Metadata alojada y comprobada.
- [ ] Mint/freeze authorities revisadas antes de cualquier revocación.
- [ ] Política de vesting implementada y verificable.
- [ ] DEX, par y presupuesto de liquidez aprobados con cifras reales.
- [ ] Plan para el LP y riesgos publicado.
- [ ] Aviso de riesgo técnico y económico revisado.
- [ ] Dominio y cuentas sociales oficiales protegidos con MFA.
- [ ] Sitio desplegado con HTTPS y mint real configurado desde entorno.
- [ ] Monitoreo, respuesta a incidentes y canal oficial definidos.
- [ ] Autorización expresa y separada para Mainnet registrada.

El script `create-token.mjs` está diseñado para Devnet y se niega a crear un token en Mainnet incluso si se configura `ALLOW_MAINNET=true`.
