RESP = $('#title');
URL = "https://student.p4ed.com/notas/dados/";

function _get_bonus(data, bimester)
{
    notas = data.Dados.DadosPagina.Materias[5].Frentes[0].NotasBimestre;
    if (notas.length <= bimester)
    {
        return 0;
    }
    return parseFloat(notas[bimester].Provas[0].Nota.replace(',', '.'));
}

function success(data)
{
    if (!data.Sucesso)
    {
        return displayError();
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
                boxHTML = '<div class="gradeframe bim_' + i + '"><h3>' + data.Nome + ' - ' + (i + 1) + 'º Bimestre' + '</h3>';
                   
                bim = bimesters[i];
                p1 = bim[0];
                p2 = bim[1];
                bonus = bim[2];
                    
                if (p1 == undefined)
                {
                    // Got no grades at all
                    boxHTML += '<p>Sem dados</p>';
                }

                else if (p2 == undefined)
                {
                    boxHTML += '<p>P1: ' + p1 + '<br>P2:';
                    // Calc how many questions you need
                    missingPoints = 12 - p1 - bonus * 2;
                    boxHTML += ' você precisa de <i>' + missingPoints + '</i> ponto' + ((missingPoints >= 2) ? 's': '') + '</p>';
                        
                    if (missingPoints > 10)
                    {
                        // Too bad
                        boxHTML += '<span class="vermelho">Situação irrecuperável, você já está de rec.</span>';
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
                                    boxHTML += 'Para ' + numsStr + ' questões, você precisa acertar ' + lastMin;
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
                    dt = total - 6;
                    boxHTML += (dt >= 0) ? 'verde">Situação: <b>aprovado</b></span></p>' : 'vermelho">Situação: <b>Rec por <i>' + Math.abs(dt) + '</i> pontos</b></span></p>';
                }
                    
                boxHTML += '</div>';
                 
                $('#main').append(boxHTML);
            }
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
}

function handleError(handler, status, error)
{
    RESP.innerHTML = "Sinto muito, ocorreu um erro. Tente novamente.";
}

$.ajax({
  dataType: "json",
  url: URL,
  success: success,
  error: handleError
});
