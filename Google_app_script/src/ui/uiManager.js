/**
 * Gestionnaire d'interface utilisateur
 */

const UIManager = {

    /**
     * Affiche un dialogue HTML
     */
    showDialog(filename, title, width, height) {
        const html = HtmlService.createTemplateFromFile(`views/dialogs/${filename}.html`);
        const output = html.evaluate()
            .setWidth(width)
            .setHeight(height);

        SpreadsheetApp.getUi().showModalDialog(output, title);
    },

    /**
     * Inclut le contenu d'un fichier (pour <?!= include() ?>)
     */
    include(filename) {
        return HtmlService.createHtmlOutputFromFile(filename).getContent();
    }
};

/**
 * Fonction globale pour inclusion dans les templates HTML
 */
function include(filename) {
    return UIManager.include(filename);
}

// ========== BACKEND FUNCTIONS FOR UI ==========

/**
 * Géocode les quartiers (backend pour dialogue)
 */
function geocodeQuartiersUI(villeId, secteurId, skipExisting, batchSize) {
    let quartiers;

    if (secteurId) {
        quartiers = QuartierService.getQuartiersBySecteur(secteurId);
    } else if (villeId) {
        quartiers = QuartierService.getQuartiersByVille(villeId);
    } else {
        quartiers = DataService.loadAll('QUARTIERS', false);
    }

    if (skipExisting) {
        quartiers = quartiers.filter(q =>
            !Utils.isValidCoordinates(q.centreLatitude, q.centreLongitude)
        );
    }

    let success = 0;
    let errors = 0;

    for (let i = 0; i < quartiers.length; i++) {
        if (i > 0 && i % batchSize === 0) {
            Utilities.sleep(2000);
        }

        try {
            GeocodingService.geocodeQuartier(quartiers[i].id);
            success++;
        } catch (e) {
            Logger.error(`Erreur quartier ${quartiers[i].id}`, { error: e.message });
            errors++;
        }

        if (i < quartiers.length - 1) {
            Utilities.sleep(500);
        }
    }

    return { success, errors, total: quartiers.length };
}

/**
 * Géocode les villes (backend pour dialogue)
 */
function geocodeVillesUI(villeIds) {
    let success = 0;

    villeIds.forEach((id, index) => {
        try {
            const ville = DataService.findById('VILLES', id);

            if (!ville) {
                throw new Error('Ville introuvable');
            }

            const address = `${ville.nom}, ${ville.codePostal}, France`;
            const result = GeocodingService.geocodeAddress(address);

            if (result.isValid) {
                DataService.update('VILLES', id, {
                    centreLatitude: result.coordinates.latitude,
                    centreLongitude: result.coordinates.longitude
                });
                success++;
            }

        } catch (e) {
            Logger.error(`Erreur ville ${id}`, { error: e.message });
        }

        if (index < villeIds.length - 1) {
            Utilities.sleep(1000);
        }
    });

    return { success, total: villeIds.length };
}

/**
 * Trouve un quartier par adresse (backend pour dialogue)
 */
function findQuartierByAddressUI(address, maxDistance) {
    const geocode = GeocodingService.geocodeAddress(address);

    if (!geocode.isValid) {
        throw new Error('Adresse invalide');
    }

    const quartier = QuartierService.findNearestQuartier(
        geocode.coordinates.latitude,
        geocode.coordinates.longitude,
        maxDistance
    );

    if (!quartier) {
        throw new Error('Aucun quartier trouvé dans le rayon spécifié');
    }

    return quartier;
}

/**
 * Trouve un quartier par coordonnées (backend pour dialogue)
 */
function findQuartierByCoordsUI(lat, lng, maxDistance) {
    const quartier = QuartierService.findNearestQuartier(lat, lng, maxDistance);

    if (!quartier) {
        throw new Error('Aucun quartier trouvé dans le rayon spécifié');
    }

    return quartier;
}

/**
 * Trouve les quartiers dans un rayon (backend pour dialogue)
 */
function findQuartiersInRadiusUI(address, radius) {
    const geocode = GeocodingService.geocodeAddress(address);

    if (!geocode.isValid) {
        throw new Error('Adresse invalide');
    }

    const quartiers = QuartierService.findQuartiersInRadius(
        geocode.coordinates.latitude,
        geocode.coordinates.longitude,
        radius
    );

    return {
        address: geocode.formattedAddress,
        center: geocode.coordinates,
        radius,
        quartiers
    };
}

/**
 * Crée une ville (backend pour dialogue)
 */
function createVilleUI(nom, codePostal, departement, pays) {
    return DataService.create('VILLES', {
        nom,
        codePostal,
        departement: departement || '',
        pays: pays || 'France'
    });
}

/**
 * Crée un secteur (backend pour dialogue)
 */
function createSecteurUI(nom, idVille, latitude, longitude) {
    return DataService.create('SECTEURS', {
        nom,
        idVille,
        centreLatitude: latitude ? parseFloat(latitude) : null,
        centreLongitude: longitude ? parseFloat(longitude) : null
    });
}

/**
 * Crée un quartier (backend pour dialogue)
 */
function createQuartierUI(nom, idSecteur, latitude, longitude) {
    return DataService.create('QUARTIERS', {
        nom,
        idSecteur,
        centreLatitude: parseFloat(latitude),
        centreLongitude: parseFloat(longitude)
    });
}

/**
 * Calcule les centroïdes des secteurs (backend pour dialogue)
 */
function calculateCentroidsUI(villeId) {
    let secteurs;

    if (villeId) {
        secteurs = DataService.loadAll('SECTEURS', false)
            .filter(s => s.idVille == villeId);
    } else {
        secteurs = DataService.loadAll('SECTEURS', false);
    }

    let success = 0;
    let errors = 0;

    secteurs.forEach(secteur => {
        try {
            const quartiers = QuartierService.getQuartiersBySecteur(secteur.id);

            if (quartiers.length === 0) {
                throw new Error('Aucun quartier dans ce secteur');
            }

            let totalLat = 0;
            let totalLng = 0;
            let count = 0;

            quartiers.forEach(q => {
                if (Utils.isValidCoordinates(q.centreLatitude, q.centreLongitude)) {
                    totalLat += q.centreLatitude;
                    totalLng += q.centreLongitude;
                    count++;
                }
            });

            if (count > 0) {
                DataService.update('SECTEURS', secteur.id, {
                    centreLatitude: totalLat / count,
                    centreLongitude: totalLng / count
                });
                success++;
            }

        } catch (e) {
            Logger.error(`Erreur secteur ${secteur.id}`, { error: e.message });
            errors++;
        }
    });

    return { success, errors, total: secteurs.length };
}

/**
 * Récupère toutes les villes (pour dropdowns)
 */
function getAllVilles() {
    return DataService.loadAll('VILLES', false);
}

/**
 * Récupère tous les secteurs (pour dropdowns)
 */
function getAllSecteurs() {
    return DataService.loadAll('SECTEURS', false);
}

/**
 * Récupère tous les quartiers (pour dropdowns)
 */
function getAllQuartiers() {
    return DataService.loadAll('QUARTIERS', false);
}

/**
 * Récupère les secteurs par ville (pour dropdowns)
 */
function getSecteursByVille(idVille) {
    return DataService.loadAll('SECTEURS', false)
        .filter(s => s.idVille == idVille);
}

/**
 * Récupère les quartiers par secteur (pour dropdowns)
 */
function getQuartiersBySecteur(idSecteur) {
    return QuartierService.getQuartiersBySecteur(idSecteur);
}

/**
 * Géocode une adresse (pour UI)
 */
function geocodeAddress(address) {
    return GeocodingService.geocodeAddress(address);
}

/**
 * Calcule une distance (pour UI)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const distance = Utils.calculateDistance(lat1, lng1, lat2, lng2);

    return {
        distance: distance,
        from: { latitude: lat1, longitude: lng1 },
        to: { latitude: lat2, longitude: lng2 }
    };
}