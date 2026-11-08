#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# If running on Windows / WSL with PowerShell available, delegate to the PowerShell script for native Windows junctions
if command -v pwsh.exe &>/dev/null || command -v powershell.exe &>/dev/null; then
    PS_EXE="pwsh.exe"
    command -v pwsh.exe &>/dev/null || PS_EXE="powershell.exe"
    
    if command -v wslpath &>/dev/null; then
        WIN_SCRIPT=$(wslpath -w "${SCRIPT_DIR}/publish-local.ps1")
    else
        WIN_SCRIPT="${SCRIPT_DIR}/publish-local.ps1"
    fi
    
    echo "Running ${PS_EXE} ${WIN_SCRIPT}..."
    exec "${PS_EXE}" -NoLogo -NoProfile -NonInteractive -File "${WIN_SCRIPT}" "$@" < /dev/null
fi

# Fallback for pure POSIX environments (e.g. native Linux/macOS)
USER_HOME="${HOME}"
RELEASE_DIR="${1:-${OPENCLI_RELEASE_DIR:-${USER_HOME}/.local/share/opencli-release}}"
GLOBAL_PKG_PATH="${2:-${OPENCLI_GLOBAL_PKG_PATH:-${USER_HOME}/.local/lib/node_modules/@jackwener/opencli}}"

echo "=== OpenCLI Local Publish (POSIX) ==="
echo "Repo Root:     ${REPO_ROOT}"
echo "Release Dir:   ${RELEASE_DIR}"
echo "Package Path:  ${GLOBAL_PKG_PATH}"

echo ""
echo "[1/4] Building OpenCLI (npm run build)..."
(cd "${REPO_ROOT}" && npm run build)

echo ""
echo "[2/4] Preparing Release Directory..."
mkdir -p "${RELEASE_DIR}"

echo ""
echo "[3/4] Syncing production assets..."
rsync -a --delete "${REPO_ROOT}/dist/" "${RELEASE_DIR}/dist/"
rsync -a --delete "${REPO_ROOT}/clis/" "${RELEASE_DIR}/clis/"
[[ -d "${REPO_ROOT}/skills" ]] && rsync -a --delete "${REPO_ROOT}/skills/" "${RELEASE_DIR}/skills/"
[[ -d "${REPO_ROOT}/scripts" ]] && rsync -a --delete "${REPO_ROOT}/scripts/" "${RELEASE_DIR}/scripts/"
rsync -a --delete "${REPO_ROOT}/node_modules/" "${RELEASE_DIR}/node_modules/"

cp -f "${REPO_ROOT}/package.json" "${RELEASE_DIR}/package.json"
cp -f "${REPO_ROOT}/cli-manifest.json" "${RELEASE_DIR}/cli-manifest.json"
[[ -f "${REPO_ROOT}/README.md" ]] && cp -f "${REPO_ROOT}/README.md" "${RELEASE_DIR}/README.md"
[[ -f "${REPO_ROOT}/README.zh-CN.md" ]] && cp -f "${REPO_ROOT}/README.zh-CN.md" "${RELEASE_DIR}/README.zh-CN.md"
[[ -f "${REPO_ROOT}/LICENSE" ]] && cp -f "${REPO_ROOT}/LICENSE" "${RELEASE_DIR}/LICENSE"

echo ""
echo "[4/4] Updating package symlink..."
mkdir -p "$(dirname "${GLOBAL_PKG_PATH}")"
if [[ -L "${GLOBAL_PKG_PATH}" ]]; then
    rm -f "${GLOBAL_PKG_PATH}"
elif [[ -d "${GLOBAL_PKG_PATH}" ]]; then
    mv "${GLOBAL_PKG_PATH}" "${GLOBAL_PKG_PATH}.bak-$(date +%Y%m%d%H%M%S)"
fi
ln -s "${RELEASE_DIR}" "${GLOBAL_PKG_PATH}"

echo ""
echo "=== Local Publish Complete ==="
