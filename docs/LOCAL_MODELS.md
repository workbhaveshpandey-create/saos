# Local AI in SAOS

The model is **optional**. The fixed CMDB rules create findings without it. A model can only generate a user-requested, plain-language explanation of a selected finding. That explanation is labeled as AI wording and should be checked against the source proof.

## Use Ollama

1. Install and start Ollama on this device.
2. Install a model using Ollama's own instructions, for example `ollama pull qwen3:8b`.
3. Open **Settings → Local AI model** in SAOS. Refresh the list, select a model that Ollama reports as installed, and save.
4. Open an issue and select **Explain in simple words**. Only that selected issue's title, rule and evidence are sent to the local Ollama process.

The app reads `OLLAMA_BASE_URL` from the environment (default `http://127.0.0.1:11434`), but rejects a non-loopback host to prevent accidentally transmitting estate data to a remote endpoint. It stores the selected model name in `.saos-data/ai.json`; it does not store a cloud API key.

Cloud providers and API-key input are intentionally disabled until an actual adapter and safe secret-handling workflow exist. A disabled placeholder is not a working provider.
