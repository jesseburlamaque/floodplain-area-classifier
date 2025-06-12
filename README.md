# floodplain-area-classifier
![Google Earth Engine](https://img.shields.io/badge/Google_Earth_Engine-4285F4?style=flat&logo=google-earth&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
[![Sentinel-2 SR](https://img.shields.io/badge/Sentinel--2_SR-326CE5?style=flat&logo=esa&logoColor=white)](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED)
[![Sentinel-1 GRD](https://img.shields.io/badge/Sentinel--1_GRD-326CE5?style=flat&logo=esa&logoColor=white)](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD)
[![Copernicus DEM](https://img.shields.io/badge/Copernicus_DEM_GLO30-00A86B?style=flat&logo=esa&logoColor=white)](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30)
[![GEDI GLAD](https://img.shields.io/badge/GEDI_GLAD_V27-228B22?style=flat&logo=nasa&logoColor=white)]([https://developers.google.com/earth-engine/datasets/catalog/projects_sat-io_open-datasets_GLAD_GEDI_V27](https://gee-community-catalog.org/projects/gfch/?h=glad+gedi))
![Lifecycle: experimental](https://img.shields.io/badge/lifecycle-experimental-orange.svg)


Floodplain Area Classifier Using Optical and Radar Imagery

# Até onde vai a cheia? Um experimento feito de curiosidade e satélites
Este repositório nasceu de uma curiosidade: "Afinal, qual é a extensão espacial da cheia..."

Este script foi pensado para detectar, classificar e comparar as áreas de água, terra firme e zonas úmidas durante os períodos de cheia e seca. Muitos testes para para ver onde a água deixa manchas de inundação, onde ela recua na estiagem e o que muda historicamente (em breve).

# Overview
Integrei dados de sensores ópticos (Sentinel-2), radar (Sentinel-1), modelo digital de elevação (DEM GLO-30) e altura de vegetação (GEDI) para caracterizar dos dois períodos. A partir disso, um classificador Random Forest foi treinado com amostras de campo:

- Água permanente
- Terra firme
- Zonas úmidas ou sazonalmente inundáveis

Com esse classificador, o script realiza a classificação supervisionada das imagens, aplica um filtro espacial (focal mode) para suavizar os resultados e gera polígonos vetoriais para análise das áreas alagadas na cheia. Em seguida, calcula as áreas (em hectares) de cada classe.

![DEM GLO-30](/images/dem.png)
