var restify = require('restify');
var builder = require('botbuilder');
var dotenv = require('dotenv');

// Levantar restify
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: '',
    appPassword: ''
});

// Instanciar el bot
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

dotenv.config();
let luisApp = process.env.LUIS_APP;
let luisKey = process.env.LUIS_KEY;

/*******************************
 * Termina la configuracion inicial
 *******************************/

// Crear un procesador LUIS que apunte a nuestro modelo en el root (/)
var model = `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${luisApp}?subscription-key=${luisKey}&verbose=true&timezoneOffset=0`;

var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.matches('ordenarPizza', [
    function(session) {
        builder.Prompts.text(session, 'Claro, ¿Cómo te llamas?');
    },
    function(session, results) {
        let msj = results.response;
        session.send(`Hola ${msj}! De que vas a querer tu pizza?`);

        var pepperoni = new builder.HeroCard(session)
            .title('Pizza de Pepperoni')
            .subtitle('Con nuestros mejores ingredientes')
            .text('Pepperoni de la toscana italiana, queso parmesano y masa normal')
            .images([
                builder.CardImage.create(session, 'http://www.91x.com/wp-content/uploads/2015/10/Pepperoni-pizza-3.jpg')
            ])
            .buttons([
                builder.CardAction.postBack(session, 'sabor pepperoni', 'Ordenar')
            ]);

        var champinones = new builder.HeroCard(session)
            .title('Pizza de champiñones')
            .subtitle('Champiñones mas frescos no podras encotrar')
            .text('Champiñones de la casa, aceitunas negras y chile morron, masa estandar')
            .images([
                builder.CardImage.create(session, 'http://www.neofungi.com/wp-content/uploads/2015/08/PIZZA-SUPREMA.png')
            ])
            .buttons([
                builder.CardAction.postBack(session, 'sabor champiñones', 'Ordenar')
            ]);

        var vegetariana = new builder.HeroCard(session)
            .title('Pizza vegetariana')
            .subtitle('Verduras, verduras y mas verduras')
            .text('Aceitunas negras, brocoli, chile morron y jitomate bola')
            .images([
                builder.CardImage.create(session, 'https://cde.peru.com//ima/0/0/6/6/7/667143/611x458/lima.jpg')
            ])
            .buttons([
                builder.CardAction.postBack(session, 'sabor vegetariana', 'Ordenar')
            ]);

        var tarjetas = [pepperoni, champinones, vegetariana];

        var msjC = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(tarjetas);
        session.send(msjC);
    }
]);

dialog.matches('elegiste', [
    function(session, args) {
        var sabor = builder.EntityRecognizer.findEntity(args.entities, 'sabor');

        session.dialogData.sabor = sabor.entity;
        //session.send(`Elegiste **${session.dialogData.sabor}**`);
        builder.Prompts.choice(session, 'Perfecto. ¿Que tipo de masa prefieres?', 'Delgada|Tradicional|De Sarten', { listStyle: builder.ListStyle.button });
    },
    function(session, results) {
        session.dialogData.masa = results.response.entity;
        builder.Prompts.choice(session, 'Suena delicioso. ¿De que tamaño sera?', 'Personal|Grande|Familiar', { listStyle: builder.ListStyle.button });
    },
    function(session, results) {
        session.dialogData.tamano = results.response.entity;
        builder.Prompts.number(session, `${session.dialogData.tamano} de ${session.dialogData.sabor}. ¿Cuantas van a ser?`)
    },
    function(session, results) {
        session.dialogData.num = results.response;
        builder.Prompts.confirm(session, '¿Te gustaría dejar alguna indicación extra?', { listStyle: builder.ListStyle.button });
    },
    function(session, results, next) {
        if (!results.response) {
            builder.Prompts.text(session, 'Danos tus indicaciones');
        } else {
            next();
        }
    },
    function(session, results) {
        var piz = 'pizza';

        if (session.dialogData.num > 1) {
            piz = 'pizzas'
        }

        session.send(`Tu orden quedo asi: ${session.dialogData.num} ${piz}, sabor ${session.dialogData.sabor}. De tamaño ${session.dialogData.tamano}.`);

        if (results.response) {
            session.dialogData.indicaciones = results.response;
            session.send(`Y tus indicaciones son: ${session.dialogData.indicaciones}`);
        }
        builder.Prompts.text(session, '¿En que dirección quieres recibir tu orden?')
    },
    function(session, results) {
        session.dialogData.direccion = results.response;
        session.endDialog('Excelente. Estamos trabajando es tu pedido. Te notificaremos en cuanto esten listas para que puedas recibirlas. Gracias por comprar en Pizzas Memo.')
    }
]);

dialog.matches('cancelarOrden', [
    function(session, args, next) {
        session.send('Ok, cancelaré tu orden.');
    }
]);

dialog.onDefault(builder.DialogAction.send("No entendí. Me lo decís de nuevo pero de otra manera, por favor?"));