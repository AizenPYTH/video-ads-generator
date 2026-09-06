#!/usr/bin/env bash
# Installs Blender as a Python module (bpy) in its own virtualenv and the
# Mesa libraries EEVEE needs to run without a display. Idempotent.
#
#   ./blender/setup.sh
#   ./blender/bin/bpy path/to/script.py -- --args
set -euo pipefail
VENV="${BLENDER_VENV:-/opt/blender-venv}"
BPY_VERSION="${BPY_VERSION:-5.0.1}"

if command -v apt-get >/dev/null 2>&1; then
  # EEVEE renders through EGL on llvmpipe when there is no GPU; Cycles needs
  # none of this but the import of bpy still wants libGL around.
  if ! ldconfig -p | grep -q libEGL.so.1; then
    (apt-get install -y -q libegl1 libgl1 libglx-mesa0 libgbm1 libgl1-mesa-dri libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 ffmpeg \
      || (apt-get update -q && apt-get install -y -q libegl1 libgl1 libglx-mesa0 libgbm1 libgl1-mesa-dri libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 ffmpeg)) >/dev/null
  fi
fi

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
if ! "$VENV/bin/python" -c "import bpy" >/dev/null 2>&1; then
  "$VENV/bin/pip" install -q "bpy==$BPY_VERSION"
fi
"$VENV/bin/python" -c "import bpy; print('bpy', bpy.app.version_string, 'ready at $VENV')"
