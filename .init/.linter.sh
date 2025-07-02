#!/bin/bash
cd /home/kavia/workspace/code-generation/chennaihomenavigator-17395-de423468/homequestai_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

