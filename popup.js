RESP = $('#title');
URL = "https://student.p4ed.com/notas/dados/";

function _get_bonus(data, bimester)
{
    notas = data.Dados.DadosPagina.Materias[5].Frentes[0].NotasBimestre;
    if (notas.length <= bimester)
    {
        return 0;
    }
    result = parseFloat(notas[bimester].Provas[0].Nota.replace(',', '.'));
    return (result == result) ? result : 0; // Handle NaN
}

function success(data)
{
    if (!data.Sucesso)
    {
        return handleError(0, 0, 0);
    }
    
    if (data.Dados.DadosPagina.Matriculas[0].Nome.indexOf('Primeiro Ano - SJC') == -1)
    {
        return handleError('showMsg', 0, 'Esta extens&atilde;o funciona exclusivamente para alunos do primeiro ano da unidade SJC.')
    }
    
    $('#title').html(data.Dados.Pessoa.Nome);
    $('#slider').show();
    $('#bimester').on('change', function()
                      {
                        setBimester(this.value);
                      });
    
    bonusList = [0, 0, 0, 0];
    for (i = 0; i < 4; i++)
    {
        bonusList[i] = _get_bonus(data, i);
    }
    
    $.each(data.Dados.DadosPagina.Materias, function (_, subject)
    {
        handleSubject(subject, bonusList);
    });
    
    setBimester(data.Dados.DadosPagina.Ciclos.length - 1);
}

function handleSubject(data, bonusList)
{
    if (data.Frentes.length)
    {
        $.each(data.Frentes, function (_, front)
        {
            handleFront(front, bonusList);
        });
    }
    
    else
    {
        handleFront(data, bonusList);
    }
}

function handleFront(data, bonusList)
{
    blacklist = ['Red', 'Rubeval', 'Victor Amorim'];
    blacklisted = false;
    $.each(blacklist, function (_, name)
    {
        blacklisted |= (data.Nome.indexOf(name) != -1);
    });
    
    if (!blacklisted)
    {
        grades = data.NotasBimestre.slice(0); // Make a copy
        
        // Parse grades
        hasTests = false;
        bimesters = []; 
        
        for (i = 0; i < 4; i++)
        {
            grades.push({});
            bd = grades.shift();
            
            p1 = undefined;
            p2 = undefined;
            bonus = bonusList[i];
            
            if (bd && bd.Provas && bd.Provas.length)
            {
                hasTests = true;
                $.each(bd.Provas, function (_, test)
                {
                    if (test.Nome.indexOf('Prova 1') != -1)
                    {
                        p1 = parseFloat(test.Nota.replace(',', '.'))
                    }
                    
                    else if (test.Nome.indexOf('Prova 2') != -1 && test.Respostas && test.Respostas.length)
                    {
                        p2 = parseFloat(test.Nota.replace(',', '.'))
                    }
                }); 
            }
            
            bimesters.push([p1, p2, bonus]);
        }
            
        if (hasTests)
        {
            for (i = 0; i < 4; i++)
            {
                boxHTML = '<div class="gradeframe bim_' + i + '"><h3>' + data.Nome + ' - ' + (i + 1) + '&deg; Bimestre' + '</h3>';
                   
                bim = bimesters[i];
                p1 = bim[0];
                p2 = bim[1];
                bonus = bim[2];
                    
                if (p1 == undefined || p1 != p1) // Handle NaN
                {
                    // Got no grades at all
                    boxHTML += '<p>Sem dados</p>';
                }
                    
                else if (p2 == undefined || p2 != p2) // Handle NaN
                {
                    boxHTML += '<p>P1: ' + p1 + '<br>P2:';
                    // Calc how many questions you need
                    missingPoints = 12 - p1 - bonus * 2;
                    boxHTML += ' voc&ecirc; precisa de <i>' + missingPoints + '</i> ponto' + ((missingPoints >= 2) ? 's': '') + '</p>';
                        
                    if (missingPoints > 10)
                    {
                        // Too bad
                        boxHTML += '<span class="vermelho">Situa&ccedil;&atilde;o irrecuper&aacute;vel, voc&ecirc; j&aacute; est&aacute; de rec.</span>';
                    }
                    
                    else
                    {
                        lastMin = 0;
                        gotFirstGroup = 0;
                        temp = []
                        for (j = 3; j <= 24; j++)
                        {
                            value = 10.0 / j;
                            qmin = Math.ceil(missingPoints / value);
                            if (qmin > lastMin || j == 24)
                            {
                                if (gotFirstGroup)
                                {
                                    if (temp.length > 1)
                                    {
                                        last = temp.pop();
                                        temp.push('ou');
                                        temp.push(last);
                                        numsStr = temp.join(', ').replace(', ou,', ' ou');
                                    }
                                
                                    else
                                    {
                                    numsStr = temp[0];
                                    }
                                
                                    boxHTML += (gotFirstGroup > 1) ? '<br>' : '';
                                    boxHTML += 'Para ' + numsStr + ' questões, voc&ecirc; precisa acertar ' + lastMin;
                                    temp = [];
                                }

                                gotFirstGroup++;
                            }
                        
                            lastMin = qmin;
                            temp.push(j);
                        }
                    }
                }
                    
                else
                {
                    boxHTML += '<p>P1: ' + p1 + '<br>P2: ' + p2 + '<br><span class="';
                    // Got all grades
                    total = (p1 + p2) / 2 + bonus;
                    dt = (total - 6).toFixed(2);
                    boxHTML += (dt >= 0) ? 'verde">Situa&ccedil;&atilde;o: <b>aprovado</b></span></p>' : 'vermelho">Situa&ccedil;&atilde;o: <b>Rec por <i>' + dt + '</i> pontos</b></span></p>';
                }
                    
                boxHTML += '</div>';
                 
                $('#main').append(boxHTML);
            }
            
            // Build the graph
            width = 400;
            height = 250;
            padding = 18;
            spacing = (width - padding - 1) / 8;
            scale = height / 10.5;
            
            uid = 'canvas-' + Math.round(Math.random() * 100000000); // If you get duplicated UIDs here you are very very very lucky
            titleNode = $('<div class="gradeframe"><h3>' + data.Nome + ' - Gr&aacute;fico de notas</h3>');
            canvasNode = $('<canvas/>').attr({'id': uid, 'width': width, 'height': height + 20});
            $('#graphs').append(titleNode);
            $('#graphs').append(canvasNode);
            
            ctx = document.getElementById(uid).getContext('2d');
            
            // Base axis
            ctx.beginPath();
            ctx.moveTo(padding, height - 1);
            ctx.lineTo(width, height - 1);
            ctx.moveTo(padding, 0);
            ctx.lineTo(padding, height - 1);
            ctx.moveTo(padding, 0);
            ctx.stroke();

            // Grade scale (y-axis)
            for (g = 0; g < 12; g++)
            {
                ctx.fillText(11 - g, 0, g * (height / 11.2) - 1);
            }
            
            // Tests (x-axis)
            for (g = 0; g < 8; g++)
            {
                b = Math.floor(g / 2) + 1;
                p = (g % 2) + 1;
                ctx.fillText("B" + b + "/P" + p, g * spacing + (padding / 2), height + 10);
            }
            
            // Helper function
            _index = 0;
            function addPoint(bimester, test, move)
            { 
                grade = bimesters[bimester][test];
                x = padding + spacing * _index++;
                y = height - scale * grade;

                if (y != y) // NaN
                    return;
                
                if (move)
                {
                    ctx.moveTo(x, y);
                }
                
                else
                {
                    ctx.lineTo(x, y);
                }
                
                
                _x = ((grade.toString().length >= 2) ? 0 : 5);
                textX = x + (move ? _x : -_x);
                    
                
                textY = (y + 15 > height) ? y - 15 : y + 15;
                ctx.fillStyle = (grade >= 6) ? 'green' : 'red';
                ctx.fillText(grade, textX, textY);
                ctx.fillStyle = '';
            }
            
            for (g = 0; g < 8; g++)
            {
                addPoint(Math.floor(g / 2), g % 2, !g);
            }
            
            ctx.stroke();
        }
    }
}

function setBimester(bimester)
{
    for (i = 0; i < 4; i++)
    {
        element = $('.bim_' + i);
        if (i == bimester)
        {
            element.show();
        }
        
        else
        {
            element.hide();
        }
    }
    
    $('#bimester')[0].selectedIndex = bimester;
}

function handleError(handler, status, error)
{
    if (handler == 'showMsg')
    {
        RESP.innerHTML = error;
    }
    
    else
    {
        RESP.innerHTML = 'Sinto muito, ocorreu um erro. Tente novamente.';
    }
}

$.ajax({
  dataType: "json",
  url: URL,
  success: success,
  error: handleError
});
