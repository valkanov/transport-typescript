import { Component, Input } from '@angular/core';
import { BaseTask } from '@vmc/vmc-api';

@Component({
    selector: 'vmc-task',
    templateUrl: './vmc-task.component.html',
    styleUrls: ['./vmc-task.component.css']
})
export class VmcTaskComponent  {

    @Input() task: BaseTask;

}