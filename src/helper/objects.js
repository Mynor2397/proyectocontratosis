const user = {
    nombre: 'Mynor',
    apellido: 'Castrillo',
    edad: 23,
    algo: '',
    estono: '',
    altura: 1.23,
    ciudad: 'Jalapa'
}

function pipeClear(info) {
    let data = JSON.stringify(info);
    let ndata = JSON.parse(data)

    console.log('Data sucia: ', ndata);

    for (element in ndata) {
        var key = element;
        var value = ndata[element];
        // console.log(`${key} ${value}`);
        if (typeof value !== 'string' || value === '') {
            if (typeof value !== 'number') {
                if (typeof value !== 'boolean') {
                    delete ndata[key];
                }
            }
        }
    }

    console.log('Data limpia: ', ndata);
}

pipeClear(user);