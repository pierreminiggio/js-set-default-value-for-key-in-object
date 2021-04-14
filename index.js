import loginToFacebook from '@pierreminiggio/facebook-login'
import scroll from '@pierreminiggio/puppeteer-page-scroller'
import puppeteer from 'puppeteer'

/**
 * @typedef {Object} FacebookPagePosterConfig
 * @property {boolean} show default false
 * 
 * @param {string} login
 * @param {string} password
 * @param {string} pageName
 * @param {string} content
 * @param {FacebookPagePosterConfig} config 
 * 
 * @returns {Promise<string>}
 */
export default function (login, password, pageName, content, config = {}) {

    return new Promise(async (resolve, reject) => {
        
        setDefaultConfig(config, 'show', false)

        let browser
        try {
            browser = await puppeteer.launch({
                headless: ! config.show,
                args: [
                    '--disable-notifications',
                    '--no-sandbox'
                ]
            })
        } catch (e) {
            reject(e)
            return
        }
        
        try {
            const page = await browser.newPage()

            await loginToFacebook(page, login, password)

            const pageLink = 'https://www.facebook.com/' + pageName
            await page.goto(pageLink)
            const newPostSelector = '[aria-label="Créer une publication"]'
            await page.waitForSelector(newPostSelector)
            await page.click(newPostSelector)
            await page.waitForTimeout(3000)

            const postInputSelector = '[role="dialog"] [contenteditable="true"]'
            await page.waitForSelector(postInputSelector)
            await page.type(postInputSelector, content)

            await page.waitForTimeout(3000)

            const postButtonSelector = '[aria-label="Publier"]'
            await page.click(postButtonSelector)

            await page.waitForTimeout(10000)

            const connectToClientCloseButtonSelector = '[aria-label="Discutez directement avec les clients"] [data-visualcompletion="ignore"]'
            const connectToClientButtonShowedUp = await page.evaluate((connectToClientCloseButtonSelector) => {
                return document.querySelector(connectToClientCloseButtonSelector) !== null
            }, connectToClientCloseButtonSelector)

            if (connectToClientButtonShowedUp) {
                await page.click(connectToClientCloseButtonSelector)
                await page.waitForTimeout(10000)
            }

            const somePopupCloseButtonSelector = '[aria-label="Fermer"]'
            const somePupupCloseButtonShowedUp = await page.evaluate((somePopupCloseButtonSelector) => {
                return document.querySelectorAll(somePopupCloseButtonSelector).length === 2
            }, somePopupCloseButtonSelector)

            if (somePupupCloseButtonShowedUp) {
                const somePopupCloseButtons = await page.$$(somePopupCloseButtonSelector)
                await somePopupCloseButtons[1].click()
                await page.waitForTimeout(10000)
            }

            await page.goto(pageLink)

            let postId
            await scroll(page, 2500)

            for (let i = 1; i < 3; i++) {
                await scroll(page, 500)
                const emptyLinkSelector = 'a[href="#"][role="link"]'
                if (await page.waitForSelector(emptyLinkSelector)) {
                    const emptyLink = await page.$(emptyLinkSelector)
                    const emptyLinkBoundingBox = await emptyLink.boundingBox()
                    await page.mouse.move(emptyLinkBoundingBox.x, emptyLinkBoundingBox.y)

                    const startOfNewPostLink = pageLink + '/posts/'
                    const newPostLinkSelector = 'a[href^="' + startOfNewPostLink + '"]'

                    postId = await page.evaluate((startOfNewPostLink, newPostLinkSelector) => {
                        const postLinkElement = document.querySelector(newPostLinkSelector)
                        return postLinkElement ? postLinkElement.href.split('?')[0].replace(
                            startOfNewPostLink,
                            ''
                        ) : null
                    }, startOfNewPostLink, newPostLinkSelector)
                }
                

                if (postId === null) {
                    const emptyFallbackLinkSelector = '.oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.gmql0nx0.gpro0wi8.b1v8xokw'
                    const emptyFallbackLinkElements = await page.$$(emptyFallbackLinkSelector)
                    
                    if (emptyFallbackLinkElements.length > 1) {
                        const emptyFallbackLinkElement = emptyFallbackLinkElements[1]
                        const emptyFallbackLinkBoundingBox = await emptyFallbackLinkElement.boundingBox()
                        await page.mouse.move(emptyFallbackLinkBoundingBox.x, emptyFallbackLinkBoundingBox.y)

                        const fallBackPostLinkSelector = 'a[href^="https://www.facebook.com/permalink.php?story_fbid="]'
                        postId = await page.evaluate(fallBackPostLinkSelector => {
                            const fallbackPostLinkElement = document.querySelector(fallBackPostLinkSelector)

                            if (fallbackPostLinkElement === null) {
                                return null
                            }

                            const fallbackPostLinkHref = fallbackPostLinkElement.href
                            if (! fallbackPostLinkHref) {
                                return null
                            }

                            const splitStory = fallbackPostLinkHref.split('?story_fbid=')
                            if (splitStory.length !== 2) {
                                return null
                            }

                            const splitAfterStory = splitStory[1].split('&')
                            if (splitAfterStory.length === 0) {
                                return null
                            }

                            return splitAfterStory[0]
                        }, fallBackPostLinkSelector)
                    }
                    
                }

                if (postId) {
                    break;
                }
            }

            await browser.close()
            resolve(postId)
        } catch (e) {
            await browser.close()
            reject(e)
        }
    })
}

/**
 * @param {FacebookPagePosterConfig} config 
 * @param {string} configKey 
 * @param {*} defaultValue
 * 
 * @returns {void}
 */
function setDefaultConfig(config, configKey, defaultValue) {
    if (! (configKey in config)) {
        config[configKey] = defaultValue
    }
}
