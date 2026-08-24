# Descarga los assets de "Decisión_va" a .\assets\decision\
# Correr UNA VEZ, parado en la carpeta del proyecto (mismo nivel que .\assets\).
# Las URLs son temporales — corré esto pronto.

New-Item -ItemType Directory -Force -Path "assets\decision" | Out-Null

function Descargar($url, $destino) {
    Invoke-WebRequest -Uri $url -OutFile $destino
}

Descargar "https://www.figma.com/api/mcp/asset/142fc208-cfc0-46f9-a04a-488aaf8a600a.svg" "assets\decision\fondo.svg"
Descargar "https://www.figma.com/api/mcp/asset/c865ace1-a273-424a-8d63-4990111a6fe6.svg" "assets\decision\logo-horizontal.svg"
Descargar "https://www.figma.com/api/mcp/asset/f764dda2-ca18-40eb-814b-9539319d2ac2.svg" "assets\decision\unr-1.svg"
Descargar "https://www.figma.com/api/mcp/asset/c958198a-1a06-4901-97c3-d361c511bf07.svg" "assets\decision\unr-2.svg"
Descargar "https://www.figma.com/api/mcp/asset/9c5a8a9a-3f33-4918-945a-1d61fe24f3c6.svg" "assets\decision\unr-base.svg"
Descargar "https://www.figma.com/api/mcp/asset/3d5c30aa-2c1f-4289-9dbf-d6c8ac31c8f1.svg" "assets\decision\unr-3.svg"
Descargar "https://www.figma.com/api/mcp/asset/1d60dd2f-a860-48dd-9cb0-d92117fca245.svg" "assets\decision\facu-logo.svg"
Descargar "https://www.figma.com/api/mcp/asset/e7f24460-9e99-4c0e-a2f3-45026f270388.svg" "assets\decision\caret-up.svg"
Descargar "https://www.figma.com/api/mcp/asset/abf24288-7a14-4488-8054-688428de511d.svg" "assets\decision\caret-down.svg"
Descargar "https://www.figma.com/api/mcp/asset/016080ed-82e3-4eb8-924f-8c593dee4f23.svg" "assets\decision\chevron-right.svg"
Descargar "https://www.figma.com/api/mcp/asset/c26e48bc-24f1-4c9d-aaa4-c91c5689315b.svg" "assets\decision\gauge-promedio.svg"
Descargar "https://www.figma.com/api/mcp/asset/6fa03cfd-4157-49a2-bb81-6c80c48c1794.svg" "assets\decision\gauge-75.svg"
Descargar "https://www.figma.com/api/mcp/asset/c179b2c5-fb75-4b44-97cd-6833332fcad4.svg" "assets\decision\gauge-50.svg"
Descargar "https://www.figma.com/api/mcp/asset/8c0b4d81-55df-49eb-b2ac-24fe6acad2bc.svg" "assets\decision\icono-personas.svg"
Descargar "https://www.figma.com/api/mcp/asset/875e0788-3b68-4a0e-8fce-0ba7c4c5e898.svg" "assets\decision\icono-libro.svg"
Descargar "https://www.figma.com/api/mcp/asset/bcc85989-6b61-4f66-87bf-368eb601a218.svg" "assets\decision\icono-datos.svg"
Descargar "https://www.figma.com/api/mcp/asset/229d116d-3572-4c84-9951-3c793ee05b1c.svg" "assets\decision\icono-globo.svg"

Write-Host "Listo. Assets en .\assets\decision\"