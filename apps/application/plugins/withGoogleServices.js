const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

function withGoogleServicesClasspath(config) {
    return withProjectBuildGradle(config, (config) => {
        const contents = config.modResults.contents;

        if (contents.includes('com.google.gms:google-services')) {
            return config;
        }

        config.modResults.contents = contents.replace(
            /classpath\('com\.facebook\.react:react-native-gradle-plugin'\)/,
            `classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('com.google.gms:google-services:4.4.2')`
        );

        return config;
    });
}

function withGoogleServicesPlugin(config) {
    return withAppBuildGradle(config, (config) => {
        const contents = config.modResults.contents;

        if (contents.includes('com.google.gms.google-services')) {
            return config;
        }

        config.modResults.contents = contents.replace(
            /apply plugin: "com\.facebook\.react"/,
            `apply plugin: "com.facebook.react"\napply plugin: "com.google.gms.google-services"`
        );

        return config;
    });
}

module.exports = (config) => {
    config = withGoogleServicesClasspath(config);
    config = withGoogleServicesPlugin(config);
    return config;
};
