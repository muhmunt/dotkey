# CLI Installation

## macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh
```

## With Go

```bash
go install github.com/muhmunt/dotkey-cli@latest
```

## Download binary

Download the latest binary for your platform from [GitHub Releases](https://github.com/muhmunt/dotkey-cli/releases/latest):

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `dotkey_*_darwin_arm64.tar.gz` |
| macOS (Intel) | `dotkey_*_darwin_amd64.tar.gz` |
| Linux (amd64) | `dotkey_*_linux_amd64.tar.gz` |
| Linux (arm64) | `dotkey_*_linux_arm64.tar.gz` |
| Windows (amd64) | `dotkey_*_windows_amd64.zip` |

Extract and move to your PATH:

```bash
tar -xzf dotkey_*.tar.gz
sudo mv dotkey /usr/local/bin/
```

## Verify

```bash
dotkey --version
dotkey --help
```

## Build from source

```bash
git clone https://github.com/muhmunt/dotkey-cli
cd dotkey-cli
go build -o dotkey .
sudo mv dotkey /usr/local/bin/
```

## Config location

After login, credentials are stored at:

| OS | Path |
|----|------|
| macOS / Linux | `~/.dotkey/config.yaml` |
| Windows | `%APPDATA%\dotkey\config.yaml` |
