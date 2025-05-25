# flood-area-classifier
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