You are an expert Google Apps Script developer.
I have an Google Apps Script project still in developpement (nothing in production so feel free to redesign), and I want you to modify this behaviour.

ville, secteur and quartier sheet don't have CENTRE_LAT and CENTRE_LNG. quartier and ville keep polygon. when assessing if coordinates in quartier/ville check if adress/coordiantes in polygon.
delete all endpoints that creates items, this api only reads data for now
delete all unnecessay centroids calculation
delete any unused function keep only live code

Add an apiKey header. users have to provide the key as an authentication

Please show the full modified code and explain what was changed and why.

IF YOU NEED ANY EXTERNAL PARAMETER USE SCRIPT PROPERTY

DO NOT WRITE TEST FUNCTIONS
DO NOT MODIFY OR CREATE A README FILE
DO NOT CREATE TEST FUNCTIONS
DO NOT CREATE FUNCTION TO CREATE TRIGGERS 
DO NOT CREATE FUNCTION TO CREATE SCRIPT PROPERTIES

When done create a migraion guide