jQuery(document).ready(function($){
    localStorage.list_index = '';
    localStorage.list_type = '';

    let $sortable = $("#sortable");
    $sortable.sortable();
    $sortable.disableSelection();
    localStorage.removeItem('local_stages');

    countTodos();

    // all done btn
    $("#checkAll").click(function(){
        AllDone();
    });

    //mark all tasks as done
    function AllDone(){
        let count = $sortable.find("li").length;
        for (let i=count-3; i>0; i--)
            $sortable.find('li:eq('+i+')').remove();
        countTodos();
    }

    //create todo
    $('#add-stage').click(function (e) {
        e.preventDefault;
        if($('.add-todo').val() !== ''){
            addStage();
        }else{
            notification('Kindly fill all required fields!','','warning');
        }
    });

    function addStage(id) {
        let stage = {},
            action_ids = [],
            action_names = [],
            stage_template = $('#stage-template').val(),
            documents = $('.document-upload-text').map(function() {
                if (this.value) return this.value;
            }).get(),
            downloads = $('.document-download-text').map(function() {
                if (this.value) return this.value;
            }).get(),
            actions = $('.local-stages-new').map(function() {
                if (this.value && (this.value !== '-- Choose Action --'))
                    return this.value;
            }).get();
        stage.name = $('#stage-name').val();
        stage.description = $('#stage-description').val();
        stage.approverID = $('#process-rights').val();
        if (!stage.name || stage_template === "-- Choose Action --" || stage.approverID === null || !actions || !actions[0])
            return notification('Kindly fill all required fields!','','warning');
        stage.approverID = stage.approverID.join(',');
        if (documents && documents[0])
            stage.document = documents.join(',');
        if (downloads && downloads[0])
            stage.download = downloads.join(',');
        $.each(actions, function (key, val) {
            let action = JSON.parse(decodeURIComponent(val));
            action_ids.push(action.ID);
            action_names.push(action.name);
            if (key === actions.length-1){
                if (action_ids[0])
                    stage.actions = action_ids.join(',');
                if (action_names[0])
                    stage.action_names = action_names;
                let stage_template_json = JSON.parse(decodeURIComponent(stage_template));
                stage.stageID = stage_template_json.ID || stage_template_json.stageID;
                stage.stage_name = stage_template_json.name;
                createTodo(stage,id);
                countTodos();
            }
        });
    }

    $('.todolist').on('click','.edit-item-enabled',function(){
        localStorage.list_type = 'enabled';
    });

    $('.todolist').on('click','.edit-item-disabled',function(){
        localStorage.list_type = 'disabled';
    });

    function enableTransitionInputs() {
        $('#stage-name').prop('disabled',false);
        $('#stage-template').prop('disabled',false);
        $('.local-stages-new').prop('disabled',false);
        $('#more-actions-link').removeClass('disabled');
        $('#stage-action-div').find('.fa-times').show();
        $('.document-upload-text').prop('disabled',false);
        $('#document-upload').removeClass('disabled');
        $('#document-upload-div').find('.fa-times').show();
        $('.document-download-text').prop('disabled',false);
        $('#document-download').removeClass('disabled');
        $('#document-download-div').find('.fa-times').show();
    }

    function disableTransitionInputs() {
        $('#stage-name').prop('disabled',true);
        $('#stage-template').prop('disabled',true);
        $('.local-stages-new').prop('disabled',true);
        $('#more-actions-link').addClass('disabled');
        $('#stage-action-div').find('.fa-times').hide();
        $('.document-upload-text').prop('disabled',true);
        $('#document-upload').addClass('disabled');
        $('#document-upload-div').find('.fa-times').hide();
        $('.document-download-text').prop('disabled',true);
        $('#document-download').addClass('disabled');
        $('#document-download-div').find('.fa-times').hide();
    }

    //load edit task
    $('.todolist').on('click','.edit-item',function(){
        $('#edit-stage').show();
        $('#add-stage').hide();
        $('#stage-action-div').html('');
        $('#document-upload-div').html('');
        $('#document-download-div').html('');

        let stage = JSON.parse(decodeURIComponent(this.id));
        $('#stage-name').val(stage.name);
        $('#stage-template').val($('#stage-template').find('option').filter(function () { return $(this).html() === stage.stage_name; }).val());
        if (stage.approverID)
            $('#process-rights').val(stage.approverID.split(','));
        refreshMultiselect();
        if (stage.actions) {
            let count = 0,
                actions_array = stage.actions.split(',');
            actions_array.forEach(function (action_id) {
                let action = ($.grep(JSON.parse(localStorage.stages), function (e) {return e.ID === parseInt(action_id);}))[0];
                count++;
                $("#stage-action-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
                    '<select id="action-name-'+count+'" class="form-control local-stages-new"><option selected="selected" value="-- Choose Action --">-- Choose Action --</option>' +
                    '</select><i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeAction(this)"></i></div>');
                getLocalStages();
                $('#action-name-'+count).val($('#action-name-'+count).find('option').filter(function () { return $(this).html() === action.name; }).val());
            });
        } else if (stage.action_names && stage.action_names[0]){
            let count = 0;
            stage.action_names.forEach(function (action) {
                count++;
                $("#stage-action-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
                    '<select id="action-name-'+count+'" class="form-control local-stages-new"><option selected="selected" value="-- Choose Action --">-- Choose Action --</option>' +
                    '</select><i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeAction(this)"></i></div>');
                getLocalStages();
                $('#action-name-'+count).val($('#action-name-'+count).find('option').filter(function () { return $(this).html() === action; }).val());
            });
        }
        if (stage.document) {
            let count = 0,
                documents_array = stage.document.split(',');
            documents_array.forEach(function (document) {
                count++;
                $("#document-upload-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
                    '    <div class="input-group-addon"><i class="fa fa-upload"></i></div>\n' +
                    '    <input id="document-name-'+count+'" type="text" class="form-control document-upload-text" placeholder="Document Upload Caption" max="50">\n' +
                    '<i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeDocumentAction(this)"></i></div>');
                $('#document-name-'+count).val(document);
            });
        }
        if (stage.download) {
            let count = 0,
                downloads_array = stage.download.split(',');
            downloads_array.forEach(function (download) {
                count++;
                $("#document-download-div").append('<div class="input-group" style="margin-bottom: 15px;">\n' +
                    '    <div class="input-group-addon"><i class="fa fa-download"></i></div>\n' +
                    '    <input id="download-name-'+count+'" type="text" class="form-control document-download-text" placeholder="Document Download Caption" max="50">\n' +
                    '<i class="fa fa-times" style="margin: 10px; color: #dc3545;" onclick="removeDocumentAction(this)"></i></div>');
                $('#download-name-'+count).val(download);
            });
        }
        localStorage.list_index = $(this).parent().index();
        if (localStorage.list_type === 'enabled'){
            enableTransitionInputs();
        } else if (localStorage.list_type === 'disabled'){
            disableTransitionInputs();
        }
    });

    //edit todo
    $('#edit-stage').click(function (e) {
        e.preventDefault;
        addStage(localStorage.list_index);
    });

    //delete done task from "already done"
    $('.todolist').on('click','.remove-item',function(){
        if (localStorage.archive_workflow === 'true')
            removeItem(this);
    });

    // count tasks
    function countTodos(){
        let count = $sortable.find("li").length;
        $('.count-todos').html(count);
    }

    //create task
    window.createTodo = function (stage_,id){
        let markup = '',
            stage = $.extend({},stage_),
            count = parseInt($sortable.find("li").length);
        delete stage.onLoad;
        delete stage.disabled;
        if (id && localStorage.list_type === 'disabled'){
            markup = '<li class="ui-state-default disabled"><span>'+stage.name+' <small> '+stage.stage_name+' → '+stage.action_names.join(" → ")+'</small></span> <input class="stage-items" value="'+encodeURIComponent(JSON.stringify(stage))+'" style="display: none;"/>' +
                '<button class="edit-item edit-item-disabled btn btn-outline-info btn-xs pull-right" id="'+encodeURIComponent(JSON.stringify(stage))+'" data-toggle="modal" data-target="#addStage"><span class="fa fa-edit"></span></button></li>';
        } else {
            if (stage.action_names){
                markup = `<li class="ui-state-default ${(stage_.disabled)? 'disabled' : ''}"><span>${stage.name} <small> ${stage.stage_name} → ${stage.action_names.join(" → ")}</small></span> <input class="stage-items" value="${encodeURIComponent(JSON.stringify(stage))}" style="display: none;"/>
                    <button class="remove-item btn btn-outline-danger btn-xs pull-right ${(stage_.disabled)? 'hide' : ''}" id="${stage.name}"><span class="fa fa-trash"></span></button><button class="edit-item edit-item-enabled btn btn-outline-info btn-xs pull-right" id="${encodeURIComponent(JSON.stringify(stage))}" data-toggle="modal" data-target="#addStage"><span class="fa fa-edit"></span></button></li>`;
            } else {
                markup = `<li class="ui-state-default ${(stage_.disabled)? 'disabled' : ''}"><span>${stage.name}</span> <input class="stage-items" value="${encodeURIComponent(JSON.stringify(stage))}" style="display: none;"/>
                    <button class="remove-item btn btn-outline-danger btn-xs pull-right ${(stage_.disabled)? 'hide' : ''}" id="${stage.name}"><span class="fa fa-trash"></span></button><button class="edit-item edit-item-enabled btn btn-outline-info btn-xs pull-right" id="${encodeURIComponent(JSON.stringify(stage))}" data-toggle="modal" data-target="#addStage"><span class="fa fa-edit"></span></button></li>`;
            }
        }
        if (id){
            if (id < count-1){
                $sortable.find('li:eq('+id+')').remove();
                $sortable.find('li:eq('+id+')').before(markup);
            } else {
                $sortable.find('li:eq('+id+')').before(markup);
                $sortable.find('li:eq('+count+')').remove();
            }
        } else {
            if (stage_.onLoad) {
                $sortable.append(markup);
            } else {
                $sortable.find('li:eq('+(count-2)+')').before(markup);
            }
        }
        clearStageInputs();
        resetMultiselect();
        getLocalStages();
    };

    function clearStageInputs() {
        $('#document-upload-div').html('');
        $('#document-download-div').html('');
        $('#stage-description').val('');
        $('#stage-action-div').html('');
        $('#stage-template').val('-- Choose Action --');
        $('#stage-name').val('');
        resetMultiselect();
    }

    $('#addTransition').on('click',function(){
        enableTransitionInputs();
        $('#edit-stage').hide();
        $('#add-stage').show();
        clearStageInputs();
    });

    //remove done task from list
    function removeItem(element){
        $(element).parent().remove();
        countTodos();
    }
});