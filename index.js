/**
 * @param {*} object 
 * @param {string} configKey 
 * @param {*} defaultValue
 * 
 * @returns {void}
 */
export default function setDefault(object, configKey, defaultValue) {
    if (! (configKey in object)) {
        object[configKey] = defaultValue
    }
}
