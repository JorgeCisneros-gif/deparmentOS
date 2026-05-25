# Generar claves VAPID

Las claves VAPID son el par público/privado que autentican tu servidor
para enviar notificaciones push. Se generan UNA SOLA VEZ y se reutilizan.

## Generar (ejecutar una sola vez)

```bash
npx web-push generate-vapid-keys
```

Salida de ejemplo:
```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
=======================================
```

## Copiar al .env del BACKEND y del SCHEDULER

```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
VAPID_SUBJECT=mailto:tu@dominio.com
```

## IMPORTANTE
- Las claves del backend y scheduler DEBEN ser las mismas
- Nunca compartir la PRIVATE KEY
- Si se pierden las claves, todos los suscriptores deben re-suscribirse
