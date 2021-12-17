const puppeteer = require('puppeteer')
const csv = require('csv-parser')
const fs = require('fs');

const dataCSV = [];

// Nome do arquivo com a lista de emails 
const fileCSV = 'list.csv';

// Nome do arquivos que serão salvas as URL dos avatares
const fileAvatarCSV = 'avatar.csv';

// faz a leitura do arquivo csv e adiciona as linhas no array dataCSV
fs.createReadStream(fileCSV)
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => dataCSV.push(data));

async function main() {

    let file;
    let page;
    let count;
    let src;
    let name;

    // Abrir o navegador
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--unhandled-rejections=strict'],
        defaultViewport: null
    });

    count = 0;

    // Repetir os passos
    for (const row of dataCSV) {

        try {

            count++;
            repeat = 0;
            src = false;
            name = false;

            if (!row['email']) {
                throw "E-mail não informado"
            }

            console.info(`Pesquisando avatar para e-mail: ${row['email']}`);

            // Se for a primeira vez ou a cada 20 abre uma nova página
            if (count == 1 || count % 20 === 0) {

                page = await browser.newPage();

                await page.goto('https://avatarapi.com/', {
                    waitUntil: 'networkidle2'
                });
            }

            await page.evaluate(() => {
                let $ = window.$;

                // Limpa os valore da img e div anterior
                document.querySelector('#divInstant').textContent = '';
                document.querySelector('#imgInstant').src = '';

                // Desativar alerta quando email nao tem avatar
                bootbox.hideAll();
            });

            await page.waitFor(1000);

            await page.waitForSelector('#tbInstant');

            let searchInput = await page.$('#tbInstant');

            await searchInput.click({ clickCount: 3 });
            await searchInput.press('Backspace');
            await searchInput.type(row['email'], { delay: 10 });

            await page.waitFor(3000);

            await page.keyboard.press('Enter');

            await page.waitFor(8000);

            // Tentar obter os valores por até 3 vezes
            do {
                await page.waitFor(1000);
                src = await page.$eval("#imgInstant", el => el.src);
                name = await page.$eval("#divInstant", el => el.textContent);
                repeat++;
                console.info('.');
            } while (!src && repeat <= 3);

            if (repeat > 3) {
                throw "Número de tentativos superior a 3";
            }

            let dados = `${row['email']};${src};${name};`;

            console.info('Dados recuperados:', dados);

            fs.appendFileSync(`./${fileAvatarCSV}`, `${dados}\n`);

        } catch (error) {
            console.log(`Erro ${error}`);
        } finally {
            console.info('          ');
        }
    }

    await page.close();

    await browser.close();

    console.info(`${count} baixados! Verifique o arquivo ${fileAvatarCSV}`);
}

main();